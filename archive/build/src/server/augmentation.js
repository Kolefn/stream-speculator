"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWinningOutcomeId = exports.createPrediction = void 0;
const crypto_1 = __importDefault(require("crypto"));
const predictionUtils_1 = require("../common/predictionUtils");
const types_1 = require("../common/types");
const PREDICTION_ID_EPOCH_MS = 854150400000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const DURATIONS = {
    FIVE_MINUTES: {
        ms: FIVE_MINUTES_MS,
        label: '5 minutes',
    },
};
const createPredictionId = () => {
    const ts = Date.now() - PREDICTION_ID_EPOCH_MS;
    const rand = parseInt(crypto_1.default.randomBytes(2).toString('hex'), 16);
    return `${ts}${rand}`;
};
const moreLessEqualViewerCount = (channelId, viewerCount, duration) => ({
    augmentation: {
        type: types_1.AugmentationType.MoreLessEqual,
        data: viewerCount,
    },
    id: createPredictionId(),
    channelId,
    status: 'active',
    title: `Viewer count in ${duration.label}.`,
    startedAt: Date.now(),
    locksAt: Date.now() + duration.ms,
    outcomes: {
        0: {
            id: '0',
            title: `More than ${viewerCount}`,
            color: 'pink',
            coinUsers: 0,
            coins: predictionUtils_1.OUTCOME_COINS_MIN,
            channelPointUsers: 0,
            channelPoints: 0,
        },
        1: {
            id: '1',
            title: `Less than ${viewerCount}`,
            color: 'blue',
            coinUsers: 0,
            coins: predictionUtils_1.OUTCOME_COINS_MIN,
            channelPointUsers: 0,
            channelPoints: 0,
        },
        2: {
            id: '2',
            title: `Exactly ${viewerCount}`,
            color: 'green',
            coinUsers: 0,
            coins: predictionUtils_1.OUTCOME_COINS_MIN,
            channelPointUsers: 0,
            channelPoints: 0,
        },
    },
});
const increaseTargetViewerCount = (channelId, uptime, viewerCount, duration) => {
    const rate = (viewerCount / uptime) * (duration.ms / uptime) * (uptime >= TEN_MINUTES_MS ? 1 : 2);
    const target = Math.floor(viewerCount + rate);
    return ({
        augmentation: {
            type: types_1.AugmentationType.IncreaseTarget,
            data: target,
        },
        id: createPredictionId(),
        channelId,
        status: 'active',
        title: `Reach ${target} or more viewers in ${duration.label}.`,
        startedAt: Date.now(),
        locksAt: Date.now() + duration.ms,
        outcomes: {
            0: {
                id: '0',
                title: 'Yes',
                color: 'pink',
                coinUsers: 0,
                coins: predictionUtils_1.OUTCOME_COINS_MIN,
                channelPointUsers: 0,
                channelPoints: 0,
            },
            1: {
                id: '1',
                title: 'No',
                color: 'blue',
                coinUsers: 0,
                coins: predictionUtils_1.OUTCOME_COINS_MIN,
                channelPointUsers: 0,
                channelPoints: 0,
            },
        },
    });
};
const createPrediction = (channelId, viewerCount, startTime) => {
    const uptime = Date.now() - startTime;
    const clampedViewerCount = Math.max(viewerCount, 1);
    if (uptime >= THIRTY_MINUTES_MS) {
        return moreLessEqualViewerCount(channelId, clampedViewerCount, DURATIONS.FIVE_MINUTES);
    }
    return increaseTargetViewerCount(channelId, uptime, clampedViewerCount, DURATIONS.FIVE_MINUTES);
};
exports.createPrediction = createPrediction;
const getWinningOutcomeId = (prediction, currentViewCount) => {
    if (!prediction.augmentation) {
        throw new Error('Prediction is not an augmentation');
    }
    const { type, data } = prediction.augmentation;
    if (type === types_1.AugmentationType.MoreLessEqual) {
        const threshold = data;
        if (threshold === currentViewCount) {
            return '2';
        }
        if (threshold > currentViewCount) {
            return '1';
        }
        return '0';
    }
    if (type === types_1.AugmentationType.IncreaseTarget) {
        const target = data;
        return currentViewCount >= target ? '0' : '1';
    }
    throw new Error(`Cannot get winning outcome of unkown augmentation type ${type}.`);
};
exports.getWinningOutcomeId = getWinningOutcomeId;
//# sourceMappingURL=augmentation.js.map