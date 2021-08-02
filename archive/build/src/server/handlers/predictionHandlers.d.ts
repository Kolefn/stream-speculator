import DB from '../../common/DBClient';
import { Prediction, Bet, BetRequest } from '../../common/types';
import Scheduler from '../Scheduler';
import TwitchClient from '../TwitchClient';
import { AuthSession } from './authHandlers';
declare type PredictionEvent = {
    type: 'begin' | 'progress' | 'lock' | 'end';
    prediction: Prediction;
};
export declare const betRequestValidator: import("express-validator").ValidationChain[] & {
    run: (req: import("express-validator/src/base").Request) => Promise<unknown[]>;
};
export declare const handleBet: (session: AuthSession | null, request: BetRequest, db: DB) => Promise<Bet>;
export declare const handleTaskPredictionEvent: (event: PredictionEvent, db: DB, scheduler: Scheduler) => Promise<void>;
export declare const handleTaskCreatePrediction: (channelId: string, db: DB, twitch: TwitchClient, scheduler: Scheduler) => Promise<void>;
export {};
//# sourceMappingURL=predictionHandlers.d.ts.map