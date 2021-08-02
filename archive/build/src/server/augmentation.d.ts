import { Prediction, UnixEpochTime } from '../common/types';
export declare const createPrediction: (channelId: string, viewerCount: number, startTime: UnixEpochTime) => Prediction;
export declare const getWinningOutcomeId: (prediction: Prediction, currentViewCount: number) => string;
//# sourceMappingURL=augmentation.d.ts.map