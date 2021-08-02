/// <reference types="react" />
import DBClient from '../../common/DBClient';
import { Prediction, StreamMetricPoint, TwitchChannel } from '../../common/types';
export declare class ChannelStore {
    loadError: Error | null;
    channel: TwitchChannel | null;
    viewerCount: StreamMetricPoint[];
    predictions: Prediction[];
    constructor();
    get currentViewerCount(): number;
    load(channelName: string): Promise<void>;
    listenToMetrics(dbClient: DBClient): Function;
    listenToPredictions(dbClient: DBClient): Function;
}
export declare const ChannelStoreContext: import("react").Context<ChannelStore>;
export declare const useChannelStore: () => ChannelStore;
//# sourceMappingURL=channelStore.d.ts.map