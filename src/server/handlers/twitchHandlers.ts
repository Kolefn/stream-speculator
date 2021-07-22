import { IncomingHttpHeaders } from 'http';
import crypto from 'crypto';
import { HelixEventSubSubscriptionStatus, HelixEventSubTransportData } from 'twitch/lib';
import {
  TwitchChannelPageData,
  TwitchChannel, StreamMetricType,
  StreamMetricPoint, StreamMetric, Prediction,
} from '../../common/types';
import { AuthSession } from './authHandlers';
import DB, {
  FaunaDoc, FaunaDocCreate, FaunaPage, FaunaRef,
} from '../../common/DBClient';
import NotFoundError from '../errors/NotFoundError';
import Scheduler, { ScheduledTask, StreamMonitoringInitialTask, TaskType } from '../Scheduler';
import TwitchClient from '../TwitchClient';
import APIResponse from '../APIResponse';

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
      response.predictions = DB.deRefPage<Prediction>(
        await params.db.exec<FaunaPage<FaunaDoc>>(
          DB.firstPage(
            DB.predictions.withRefsTo([
              {
                collection: DB.channels,
                id: channel.id,
              },
              {
                collection: DB.users,
                id: params.session.userId,
              },
            ]),
            10,
          ),
        ),
      );
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
          stream: {
            id: stream.id,
            startedAt: stream.startDate.getTime(),
            viewerCount: stream.viewers,
          },
        }),
      ),
    );

    return new APIResponse({
      status: 200,
      data: { channel: DB.deRef<TwitchChannel>(result.doc) },
      onSend: async () => {
        if (!result.created) {
          return;
        }
        await params.scheduler.scheduleBatch([
          {
            type: TaskType.MonitorChannel,
            data: { channelId: stream.userId },
          },
          StreamMonitoringInitialTask,
        ]);
      },
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
    return new APIResponse({
      status: 200,
      data: verificationBody.challenge,
      contentType: 'plain/text',
      onSend: async () => {
        await clients.db.exec(DB.create(DB.webhookSubs,
          {
            _id: verificationBody.subscription.id,
            type: verificationBody.subscription.type,
            channelId: verificationBody.subscription.condition.broadcaster_user_id,
          }));
      },
    });
  }

  return new APIResponse({
    status: 200,
    onSend: async () => {
      if (type !== 'notification') {
        return;
      }

      const notificationBody = body as EventSubNotificationBody;
      const { event } = notificationBody;
      const eventType = notificationBody.subscription.type;
      const channelId = event.broadcaster_user_id;
      if (eventType === 'stream.online') {
        const update = {
          isLive: true,
          stream: {
            id: event.id,
            startedAt: new Date(event.started_at).getTime(),
            viewerCount: 0,
          },
        };
        await clients.db.exec(DB.update(DB.channels.doc(channelId), update));
        await clients.scheduler.schedule(StreamMonitoringInitialTask);
        await clients.twitch.subToPredictionEvents(channelId);
      } else if (eventType === 'stream.offline') {
        await clients.db.exec(
          DB.batch(
            DB.update(DB.scheduledTasks.doc(TaskType.MonitorStreams.toString()),
              { streamsChanged: true }),
            DB.update(DB.channels.doc(channelId), { isLive: false }),
          ),
        );
        const page = await clients.db.exec<FaunaPage<FaunaDoc>>(
          DB.firstPage(DB.webhookSubs.withRefsTo([{ collection: DB.channels, id: channelId }])),
        );
        const docsToDelete = page.data
          .filter((doc) => doc.data.type !== 'stream.online' && doc.data.type !== 'stream.offline');

        await clients.twitch.deleteSubs(
          docsToDelete.map(({ data: { _id } }) => _id),
        );

        await clients.db.exec(
          DB.batch(
            ...docsToDelete.map((doc) => DB.delete(DB.webhookSubs.doc(doc.ref.id))),
          ),
        );
      }
    },
  });
};

export const handleTaskMonitorChannel = async (
  data: { channelId: string },
  twitch: TwitchClient,
) => {
  if (!process.env.LOCAL) {
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
