import { IncomingHttpHeaders } from 'http';
import { TwitchChannelPageData } from '../../common/types';
import { AuthSession } from './authHandlers';
import DB from '../../common/DBClient';
import Scheduler, { ScheduledTask } from '../Scheduler';
import TwitchClient from '../TwitchClient';
import APIResponse from '../APIResponse';
declare type StreamEvent = {
    type: 'stream.online' | 'stream.offline';
    channelId: string;
};
export declare const getTwitchChannelPageData: (params: {
    channelName: string;
    session: AuthSession | null;
    db: DB;
    twitch: TwitchClient;
    scheduler: Scheduler;
}) => Promise<APIResponse<TwitchChannelPageData>>;
export declare const handleTwitchWebhook: (headers: IncomingHttpHeaders, rawBody: string, clients: {
    scheduler: Scheduler;
    db: DB;
    twitch: TwitchClient;
}) => Promise<APIResponse<any>>;
export declare const handleTaskMonitorChannel: (data: {
    channelId: string;
}, twitch: TwitchClient) => Promise<void>;
export declare const handleTaskMonitorStreams: (task: ScheduledTask, scheduler: Scheduler, db: DB) => Promise<void>;
export declare const handleTaskGetRealTimeStreamMetrics: (data: string[], twitch: TwitchClient, db: DB) => Promise<void>;
export declare const handleTaskStreamEvent: (event: StreamEvent, scheduler: Scheduler, db: DB) => Promise<void>;
export {};
//# sourceMappingURL=twitchHandlers.d.ts.map