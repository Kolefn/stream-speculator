import { StreamMetricPoint } from './types';
declare type Points = StreamMetricPoint[];
export declare const OUTCOME_COINS_MIN = 100;
export declare const CHANNEL_POINTS_TO_COINS_RATIO = 1;
export declare const MAXIMUM_BET = 50000;
export declare const WINS_PER_BONUS = 50;
export declare const WIN_BONUS_COINS = 1000;
export declare const channelPointsToCoins: (val: number) => number;
export declare const isValidBetAmount: (val: number) => boolean;
export declare const fillPointGaps: (points: Points) => Points;
export {};
//# sourceMappingURL=predictionUtils.d.ts.map