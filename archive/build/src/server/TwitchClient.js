"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const twitch_1 = require("twitch");
const twitch_pubsub_client_1 = require("twitch-pubsub-client");
const cryptr_1 = __importDefault(require("cryptr"));
const TwitchAuthProvider_1 = __importDefault(require("./TwitchAuthProvider"));
const types_1 = require("../common/types");
const EVENTSUB_OPTIONS = {
    secret: process.env.TWITCH_WEBHOOK_SECRET,
    callback: process.env.TWITCH_WEBHOOK_CALLBACK,
    method: 'webhook',
};
class TwitchClient {
    constructor(dbClient) {
        this.auth = new TwitchAuthProvider_1.default(process.env.TWITCH_CLIENT_ID, process.env.TWITCH_CLIENT_SECRET, dbClient);
        this.pubsub = new twitch_pubsub_client_1.BasicPubSubClient();
        this.db = dbClient;
        this.api = new twitch_1.ApiClient({ authProvider: this.auth });
    }
    async deleteSubs(subIds) {
        await Promise.all(subIds.map((id) => this.api.helix.eventSub.deleteSubscription(id)));
    }
    async subToPredictionEvents(channelId) {
        const predBeginReq = this.api.helix.eventSub.subscribeToChannelPredictionBeginEvents(channelId, EVENTSUB_OPTIONS);
        const predEndReq = this.api.helix.eventSub.subscribeToChannelPredictionEndEvents(channelId, EVENTSUB_OPTIONS);
        const predProgReq = this.api.helix.eventSub.subscribeToChannelPredictionProgressEvents(channelId, EVENTSUB_OPTIONS);
        const predLockReq = this.api.helix.eventSub.subscribeToChannelPredictionLockEvents(channelId, EVENTSUB_OPTIONS);
        return {
            predictionBeginSub: await predBeginReq,
            predictionEndSub: await predEndReq,
            predictionProgressSub: await predProgReq,
            predictionLockSub: await predLockReq,
        };
    }
    async subToChannelEvents(channelId) {
        const onlineReq = this.api.helix.eventSub.subscribeToStreamOnlineEvents(channelId, EVENTSUB_OPTIONS);
        const offlineReq = this.api.helix.eventSub.subscribeToStreamOfflineEvents(channelId, EVENTSUB_OPTIONS);
        return {
            onlineSub: await onlineReq,
            offlineSub: await offlineReq,
        };
    }
    static getSecondsBeforeNextViewerCountUpdate() {
        const now = new Date();
        const sec = now.getSeconds() + (now.getMilliseconds() / 1000);
        if (sec >= 30) {
            return 60 - sec;
        }
        return 30 - sec;
    }
    async getStreamViewerCounts(channelIds) {
        await this.pubsub.connect();
        await this.pubsub.listen(channelIds.map((id) => `video-playback-by-id.${id}`), this.auth);
        const output = {};
        let outputSize = 0;
        await new Promise((resolve) => {
            const timeoutMs = TwitchClient.getSecondsBeforeNextViewerCountUpdate() * 1000 + 2000;
            console.log('TimeoutMs', timeoutMs);
            const timeout = setTimeout(() => {
                resolve(output);
            }, timeoutMs);
            this.pubsub.onMessage((topic, anyData) => {
                const data = anyData;
                const channelId = topic.split('.')[1];
                if (data.type === 'viewcount') {
                    output[channelId] = {
                        channelId,
                        type: types_1.StreamMetricType.ViewerCount,
                        value: data.viewers,
                        timestamp: data.server_time * 1000,
                    };
                    outputSize += 1;
                    if (outputSize === channelIds.length) {
                        clearTimeout(timeout);
                        resolve(output);
                    }
                }
            });
        });
        await this.pubsub.disconnect();
        return output;
    }
    static encryptToken(token) {
        return new cryptr_1.default(process.env.TWITCH_TOKEN_ENCRYPTION_KEY).encrypt(JSON.stringify({
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            expiresAt: token.expiryDate?.getTime(),
        }));
    }
}
exports.default = TwitchClient;
TwitchClient.MaxWebsocketTopicsPerIP = 500;
//# sourceMappingURL=TwitchClient.js.map