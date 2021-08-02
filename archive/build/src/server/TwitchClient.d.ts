import { AccessToken, ApiClient, HelixEventSubSubscription } from 'twitch';
import { BasicPubSubClient } from 'twitch-pubsub-client';
import DBClient from '../common/DBClient';
import TwitchAuthProvider from './TwitchAuthProvider';
import { StreamMetric } from '../common/types';
declare type StreamMetricUpdateByChannel = {
    [channelId: string]: StreamMetric;
};
export default class TwitchClient {
    static readonly MaxWebsocketTopicsPerIP = 500;
    api: ApiClient;
    pubsub: BasicPubSubClient;
    auth: TwitchAuthProvider;
    db: DBClient;
    constructor(dbClient: DBClient);
    deleteSubs(subIds: string[]): Promise<void>;
    subToPredictionEvents(channelId: string): Promise<{
        [key: string]: HelixEventSubSubscription;
    }>;
    subToChannelEvents(channelId: string): Promise<{
        [key: string]: HelixEventSubSubscription;
    }>;
    static getSecondsBeforeNextViewerCountUpdate(): number;
    getStreamViewerCounts(channelIds: string[]): Promise<StreamMetricUpdateByChannel>;
    static encryptToken(token: AccessToken): string;
}
export {};
//# sourceMappingURL=TwitchClient.d.ts.map