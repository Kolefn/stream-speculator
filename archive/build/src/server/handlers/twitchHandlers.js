"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTaskStreamEvent = exports.handleTaskGetRealTimeStreamMetrics = exports.handleTaskMonitorStreams = exports.handleTaskMonitorChannel = exports.handleTwitchWebhook = exports.getTwitchChannelPageData = void 0;
const crypto_1 = __importDefault(require("crypto"));
const types_1 = require("../../common/types");
const DBClient_1 = __importDefault(require("../../common/DBClient"));
const NotFoundError_1 = __importDefault(require("../errors/NotFoundError"));
const Scheduler_1 = __importStar(require("../Scheduler"));
const TwitchClient_1 = __importDefault(require("../TwitchClient"));
const APIResponse_1 = __importDefault(require("../APIResponse"));
const augmentation_1 = require("../augmentation");
const getTwitchChannelPageData = async (params) => {
    const userName = params.channelName.toLowerCase();
    try {
        const channel = DBClient_1.default.deRef(await params.db.exec(DBClient_1.default.get(DBClient_1.default.channels.with('userName', userName))));
        const response = { channel };
        if (channel.isLive) {
            response.metrics = {
                viewerCount: await params.db.history(DBClient_1.default.streamMetric(channel.id, types_1.StreamMetricType.ViewerCount), 1000 * 60 * 60),
            };
        }
        if (params.session) {
            response.predictions = DBClient_1.default.deRefPage(await params.db.exec(DBClient_1.default.getSortedResults(DBClient_1.default.firstPage(DBClient_1.default.predictions.withRefsTo([
                {
                    collection: DBClient_1.default.channels,
                    id: channel.id,
                },
            ]), 10))));
        }
        return new APIResponse_1.default({ status: 200, data: response });
    }
    catch {
        const stream = await params.twitch.api.helix.streams.getStreamByUserName(userName);
        if (!stream) {
            throw new NotFoundError_1.default(`${userName} TwitchStream`);
        }
        const result = await params.db.exec(DBClient_1.default.batch(DBClient_1.default.create(DBClient_1.default.streamMetrics, {
            id: `${stream.userId}${types_1.StreamMetricType.ViewerCount.toString()}`,
            channelId: stream.userId,
            type: types_1.StreamMetricType.ViewerCount,
            value: stream.viewers,
            timestamp: Date.now() / 1000,
        }), DBClient_1.default.create(DBClient_1.default.channels, {
            id: stream.userId,
            displayName: stream.userDisplayName,
            userName: stream.userName,
            isLive: true,
            stream: {
                id: stream.id,
                startedAt: stream.startDate.getTime(),
                viewerCount: stream.viewers,
            },
        })));
        if (result.created) {
            await params.scheduler.scheduleBatch([
                {
                    type: Scheduler_1.TaskType.MonitorChannel,
                    data: { channelId: stream.userId },
                },
                Scheduler_1.StreamMonitoringInitialTask,
                {
                    type: Scheduler_1.TaskType.PredictionEvent,
                    data: {
                        type: 'begin',
                        prediction: augmentation_1.createPrediction(stream.userId, stream.viewers, stream.startDate.getTime()),
                    },
                },
            ]);
        }
        return new APIResponse_1.default({
            status: 200,
            data: { channel: DBClient_1.default.deRef(result.doc) },
        });
    }
};
exports.getTwitchChannelPageData = getTwitchChannelPageData;
const handleTwitchWebhook = async (headers, rawBody, clients) => {
    const messageId = headers['twitch-eventsub-message-id'];
    const timestamp = headers['twitch-eventsub-message-timestamp'];
    const algoSig = headers['twitch-eventsub-message-signature'];
    const type = headers['twitch-eventsub-message-type'];
    if (!type || !algoSig || !messageId || !timestamp) {
        return new APIResponse_1.default({ status: 400 });
    }
    const [algorithm, signature] = algoSig.split('=', 2);
    if (crypto_1.default
        .createHmac(algorithm, process.env.TWITCH_WEBHOOK_SECRET)
        .update(messageId + timestamp + rawBody)
        .digest('hex') !== signature) {
        return new APIResponse_1.default({ status: 401 });
    }
    const body = JSON.parse(rawBody);
    if (type === 'webhook_callback_verification') {
        const verificationBody = body;
        await clients.db.exec(DBClient_1.default.create(DBClient_1.default.webhookSubs, {
            _id: verificationBody.subscription.id,
            type: verificationBody.subscription.type,
            channelId: verificationBody.subscription.condition.broadcaster_user_id,
        }));
        return new APIResponse_1.default({
            status: 200,
            data: verificationBody.challenge,
            contentType: 'plain/text',
        });
    }
    if (type !== 'notification') {
        return APIResponse_1.default.EmptyOk;
    }
    const notificationBody = body;
    const { event } = notificationBody;
    const eventType = notificationBody.subscription.type;
    const channelId = event.broadcaster_user_id;
    if (eventType === 'stream.online' || eventType === 'stream.offline') {
        await clients.scheduler.schedule({
            type: Scheduler_1.TaskType.StreamEvent,
            data: {
                type: eventType, channelId, startedAt: event.started_at, streamId: event.id,
            },
        });
    }
    else if (eventType.indexOf('channel.prediction.') > -1) {
        const prediction = {
            id: event.id,
            channelId: event.broadcaster_user_id,
            title: event.title,
            outcomes: event.outcomes.map((item) => ({
                id: item.id,
                title: item.title,
                color: item.color,
                channelPointUsers: item.users ?? 0,
                channelPoints: item.channel_points ?? 0,
                coins: 0,
                coinUsers: 0,
            })).reduce((a, b) => {
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
            type: Scheduler_1.TaskType.PredictionEvent,
            data: { type: eventType.split('channel.prediction.')[1], prediction },
        });
    }
    return new APIResponse_1.default({
        status: 200,
    });
};
exports.handleTwitchWebhook = handleTwitchWebhook;
const handleTaskMonitorChannel = async (data, twitch) => {
    if (!process.env.LOCAL) {
        await twitch.subToChannelEvents(data.channelId);
    }
};
exports.handleTaskMonitorChannel = handleTaskMonitorChannel;
const handleTaskMonitorStreams = async (task, scheduler, db) => {
    const nextTasks = [];
    const streamsChanged = await db.exec(DBClient_1.default.ifTrueSetFalse(DBClient_1.default.scheduledTasks.doc(Scheduler_1.TaskType.MonitorStreams.toString()), 'streamsChanged'));
    console.log('streamsChanged', streamsChanged);
    if (streamsChanged) {
        await db.forEachPage(DBClient_1.default.channels.with('isLive', true), async (page) => {
            if (page.data.length > 0) {
                nextTasks.push({
                    type: Scheduler_1.TaskType.GetRealTimeStreamMetrics,
                    data: page.data.map((ref) => ref.id),
                });
            }
        }, { size: TwitchClient_1.default.MaxWebsocketTopicsPerIP });
    }
    else {
        nextTasks.push(...task.data.subTasks);
    }
    if (nextTasks.length > 0) {
        nextTasks.push({ ...task, data: { subTasks: [...nextTasks] }, isRepeat: true });
        await scheduler.scheduleBatch(nextTasks);
    }
    else {
        await Scheduler_1.default.end(task);
    }
};
exports.handleTaskMonitorStreams = handleTaskMonitorStreams;
const handleTaskGetRealTimeStreamMetrics = async (data, twitch, db) => {
    console.log('streamMetricChannels', data.length);
    const updates = await twitch.getStreamViewerCounts(data);
    await db.exec(DBClient_1.default.batch(...Object.keys(updates).map((channelId) => {
        const update = updates[channelId];
        return DBClient_1.default.update(DBClient_1.default.streamMetric(update.channelId, update.type), update);
    })));
};
exports.handleTaskGetRealTimeStreamMetrics = handleTaskGetRealTimeStreamMetrics;
const handleTaskStreamEvent = async (event, scheduler, db) => {
    if (event.type === 'stream.online') {
        const onlineEvent = event;
        const update = {
            isLive: true,
            stream: {
                id: onlineEvent.streamId,
                startedAt: new Date(onlineEvent.startedAt).getTime(),
                viewerCount: 0,
            },
        };
        await db.exec(DBClient_1.default.update(DBClient_1.default.channels.doc(event.channelId), update));
        await scheduler.scheduleBatch([
            Scheduler_1.StreamMonitoringInitialTask,
            {
                type: Scheduler_1.TaskType.CreatePrediction,
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
    }
    else if (event.type === 'stream.offline') {
        const page = await db.exec(DBClient_1.default.batch(DBClient_1.default.update(DBClient_1.default.scheduledTasks.doc(Scheduler_1.TaskType.MonitorStreams.toString()), { streamsChanged: true }), DBClient_1.default.update(DBClient_1.default.channels.doc(event.channelId), { isLive: false }), DBClient_1.default.firstPage(DBClient_1.default.predictions.withMulti([
            { field: 'channelRef', value: DBClient_1.default.channels.doc(event.channelId) },
            { field: 'status', value: 'active' },
        ]))));
        await scheduler.scheduleBatch(page.data.map((doc) => ({
            type: Scheduler_1.TaskType.PredictionEvent,
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
exports.handleTaskStreamEvent = handleTaskStreamEvent;
//# sourceMappingURL=twitchHandlers.js.map