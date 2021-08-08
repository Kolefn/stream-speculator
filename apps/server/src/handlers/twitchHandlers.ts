import { IncomingHttpHeaders } from 'http';
import crypto from 'crypto';
import { HelixEventSubSubscriptionStatus, HelixEventSubTransportData } from 'twitch/lib';
import {
  TwitchChannelPageData,
  TwitchChannel, StreamMetricType,
  StreamMetricPoint, StreamMetric, Prediction, PredictionOutcome,
  FaunaDoc, FaunaDocCreate, FaunaPage, FaunaRef,
  DBClient as DB,
  Bet,
  getPersonalNet,
} from '@stream-speculator/common';
import { AuthSession } from './authHandlers';
import NotFoundError from '../errors/NotFoundError';
import Scheduler, { ScheduledTask, StreamMonitoringInitialTask, TaskType } from '../Scheduler';
import TwitchClient from '../TwitchClient';
import APIResponse from '../APIResponse';
import { createPrediction } from '../augmentation';

interface EventSubSubscriptionBody {
  id: string;
  status: HelixEventSubSubscriptionStatus;
  type: string;
  version: string;
  condition: Record<string, string>;
  transport: HelixEventSubTransportData;
  created_at: string;
}

interface BaseEventSubBody {
  subscription: EventSubSubscriptionBody;
}

interface EventSubVerificationBody extends BaseEventSubBody {
  challenge: string;
}

interface EventSubNotificationBody extends BaseEventSubBody {
  event: { [key: string] : any };
}

type StreamEvent = {
  type: 'stream.online' | 'stream.offline';
  channelId: string;
};

type StreamOnlineEvent = StreamEvent & {
  type: 'stream.online';
  streamId: string;
  startedAt: string;
};

export const getTwitchChannelPageData = async (params:
{
  channelName: string,
  session: AuthSession | null,
  db: DB, twitch: TwitchClient,
  scheduler: Scheduler
})
: Promise<APIResponse<TwitchChannelPageData>> => {
  const userName = params.channelName.toLowerCase();
  try {
    const channel = DB.deRef<TwitchChannel>(
      await params.db.exec(
        DB.get(DB.channels.with('userName', userName)),
      ),
    );
    const response: TwitchChannelPageData = { channel };
    if (channel.isLive) {
      response.metrics = {
        viewerCount: await params.db.history<StreamMetricPoint>(
          DB.streamMetric(channel.id, StreamMetricType.ViewerCount),
          1000 * 60 * 60,
        ),
      };
    }

    if (params.session) {
      const pages = await params.db.exec<{ predictions: FaunaPage<FaunaDoc>, bets: FaunaPage<FaunaDoc> }>(
        DB.named({
          predictions: DB.getSortedResults(
            DB.firstPage(
              DB.predictions.withRefsTo([
                {
                  collection: DB.channels,
                  id: channel.id,
                },
              ]),
              10,
            ),
          ),
          bets: DB.firstPage(DB.bets.withRefsTo([{ collection: DB.channels, id: channel.id }]), 30),
        })
      );
      response.predictions = DB.deRefPage<Prediction>(pages.predictions);
      response.bets = DB.deRefPage<Bet>(pages.bets);
      response.predictions = response.predictions.map((p)=> {
        if(p.status === 'resolved'){
          return {...p, personalNet: getPersonalNet(p, response.bets) };
        }
        return p;
      });
      response.bets.forEach((b)=> {
        const index = response.predictions.findIndex((p)=> p.id === b.predictionId);
        response.predictions[index].outcomes[b.outcomeId].personalBet = b.coins;
      });
    }
    return new APIResponse({ status: 200, data: response });
  } catch {
    const stream = await params.twitch.api.helix.streams.getStreamByUserName(userName);
    if (!stream) {
      throw new NotFoundError(`${userName} TwitchStream`);
    }

    const result = await params.db.exec<FaunaDocCreate>(
      DB.batch(
        DB.create<StreamMetric & { id: string }>(DB.streamMetrics, {
          id: `${stream.userId}${StreamMetricType.ViewerCount.toString()}`,
          channelId: stream.userId,
          type: StreamMetricType.ViewerCount,
          value: stream.viewers,
          timestamp: Date.now() / 1000,
        }),
        DB.create<TwitchChannel>(DB.channels, {
          id: stream.userId,
          displayName: stream.userDisplayName,
          userName: stream.userName,
          isLive: true,
          profileImageUrl: (await stream.getUser()).profilePictureUrl,
          stream: {
            id: stream.id,
            startedAt: stream.startDate.getTime(),
            viewerCount: stream.viewers,
            title: stream.title,
          },
        }),
      ),
    );

    if (result.created) {
      await params.scheduler.scheduleBatch([
        {
          type: TaskType.MonitorChannel,
          data: { channelId: stream.userId },
        },
        StreamMonitoringInitialTask,
        {
          type: TaskType.PredictionEvent,
          data: {
            type: 'begin',
            prediction: createPrediction(
              stream.userId,
              stream.viewers,
              stream.startDate.getTime(),
            ),
          },
        },
      ]);
    }

    return new APIResponse({
      status: 200,
      data: { channel: DB.deRef<TwitchChannel>(result.doc) },
    });
  }
};

export const handleTwitchWebhook = async (headers: IncomingHttpHeaders, rawBody: string,
  clients: { scheduler: Scheduler, db: DB, twitch: TwitchClient })
: Promise<APIResponse<any>> => {
  const messageId = headers['twitch-eventsub-message-id'] as string;
  const timestamp = headers['twitch-eventsub-message-timestamp'] as string;
  const algoSig = headers['twitch-eventsub-message-signature'] as string;
  const type = headers['twitch-eventsub-message-type'] as string;

  if (!type || !algoSig || !messageId || !timestamp) {
    return new APIResponse({ status: 400 });
  }

  const [algorithm, signature] = algoSig.split('=', 2);

  if (crypto
    .createHmac(algorithm, process.env.TWITCH_WEBHOOK_SECRET as string)
    .update(messageId + timestamp + rawBody)
    .digest('hex') !== signature) {
    return new APIResponse({ status: 401 });
  }

  const body = JSON.parse(rawBody);

  if (type === 'webhook_callback_verification') {
    const verificationBody = body as EventSubVerificationBody;
    await clients.db.exec(DB.create(DB.webhookSubs,
      {
        _id: verificationBody.subscription.id,
        type: verificationBody.subscription.type,
        channelId: verificationBody.subscription.condition.broadcaster_user_id,
      }));
    return new APIResponse({
      status: 200,
      data: verificationBody.challenge,
      contentType: 'plain/text',
    });
  }

  if (type !== 'notification') {
    return APIResponse.EmptyOk;
  }

  const notificationBody = body as EventSubNotificationBody;
  const { event } = notificationBody;
  const eventType = notificationBody.subscription.type;
  const channelId = event.broadcaster_user_id;

  if (eventType === 'stream.online' || eventType === 'stream.offline') {
    await clients.scheduler.schedule({
      type: TaskType.StreamEvent,
      data: {
        type: eventType, channelId, startedAt: event.started_at, streamId: event.id,
      },
    });
  } else if (eventType.indexOf('channel.prediction.') > -1) {
    const prediction: Prediction = {
      id: event.id,
      channelId: event.broadcaster_user_id,
      title: event.title,
      outcomes: (event.outcomes as any[]).map((item: any) : PredictionOutcome => ({
        id: item.id,
        title: item.title,
        color: item.color,
        channelPointUsers: item.users ?? 0,
        channelPoints: item.channel_points ?? 0,
        coins: 0,
        coinUsers: 0,
      })).reduce((a: { [key:string]: PredictionOutcome }, b) => {
        // eslint-disable-next-line no-param-reassign
        a[b.id] = b;
        return a;
      }, {}),
      status: event.status ?? 'active',
      winningOutcomeId: event.winning_outcome_id,
      startedAt: new Date(event.started_at).getTime(),
      locksAt: new Date(event.locks_at).getTime(),
      endedAt: event.ended_at ? new Date(event.ended_at).getTime() : undefined,
    };
    await clients.scheduler.schedule({
      type: TaskType.PredictionEvent,
      data: { type: eventType.split('channel.prediction.')[1], prediction },
    });
  }

  return new APIResponse({
    status: 200,
  });
};

export const handleTaskMonitorChannel = async (
  data: { channelId: string },
  twitch: TwitchClient,
) => {
  if (!process.env.IS_OFFLINE) {
    await twitch.subToChannelEvents(data.channelId);
  }
};

export const handleTaskMonitorStreams = async (
  task: ScheduledTask,
  scheduler: Scheduler,
  db: DB,
) => {
  const nextTasks: ScheduledTask[] = [];
  const streamsChanged = await db.exec<boolean>(
    DB.ifTrueSetFalse(DB.scheduledTasks.doc(TaskType.MonitorStreams.toString()), 'streamsChanged'),
  );
  if (streamsChanged) {
    await db.forEachPage<FaunaRef>(DB.channels.with('isLive', true), async (page) => {
      if (page.data.length > 0) {
        nextTasks.push({
          type: TaskType.GetRealTimeStreamMetrics,
          data: page.data.map((ref) => ref.id),
        });
      }
    }, { size: TwitchClient.MaxWebsocketTopicsPerIP });
  } else {
    nextTasks.push(...task.data.subTasks);
  }

  if (nextTasks.length > 0) {
    nextTasks.push({ ...task, data: { subTasks: [...nextTasks] }, isRepeat: true });
    await scheduler.scheduleBatch(nextTasks);
  } else {
    await Scheduler.end(task);
  }
};

export const handleTaskGetRealTimeStreamMetrics = async (
  data: string[],
  twitch: TwitchClient, db: DB,
) => {
  const updates = await twitch.getStreamViewerCounts(data);
  await db.exec(DB.batch(...Object.keys(updates).map((channelId) => {
    const update = updates[channelId];
    return DB.update(DB.streamMetric(update.channelId, update.type), update);
  })));
};

export const handleTaskStreamEvent = async (
  event: StreamEvent,
  scheduler: Scheduler,
  db: DB,
  twitch: TwitchClient
) => {
  if (event.type === 'stream.online') {
    const onlineEvent = (event as StreamOnlineEvent);
    const streamInfo = await twitch.api.helix.streams.getStreamByUserId(onlineEvent.channelId);
    const update: Partial<TwitchChannel> = {
      isLive: true,
      stream: {
        id: onlineEvent.streamId,
        title: streamInfo.title,
        startedAt: new Date(onlineEvent.startedAt).getTime(),
        viewerCount: streamInfo.viewers,
      },
    };
    await db.exec(DB.update(DB.channels.doc(event.channelId), update));
    await scheduler.scheduleBatch([
      StreamMonitoringInitialTask,
      {
        type: TaskType.CreatePrediction,
        data: {
          channelId: event.channelId,
        },
        when: [
          {
            timestamp: Date.now() + 10 * 60 * 1000,
          },
        ],
      },
    ]);
  } else if (event.type === 'stream.offline') {
    const page = await db.exec<FaunaPage<FaunaDoc>>(
      DB.batch(
        DB.update(DB.scheduledTasks.doc(TaskType.MonitorStreams.toString()),
          { streamsChanged: true }),
        DB.update(DB.channels.doc(event.channelId), { isLive: false }),
        DB.firstPage(DB.predictions.withMulti([
          { field: 'channelRef', value: DB.channels.doc(event.channelId) },
          { field: 'status', value: 'active' },
        ])),
      ),
    );

    await scheduler.scheduleBatch(page.data.map((doc) => ({
      type: TaskType.PredictionEvent,
      data: {
        type: 'end',
        prediction: {
          id: doc.ref.id,
          winningOutcomeId: null,
          status: 'canceled',
        },
      },
    })));
  }
};
