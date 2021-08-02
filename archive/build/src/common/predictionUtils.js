"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fillPointGaps = exports.isValidBetAmount = exports.channelPointsToCoins = exports.WIN_BONUS_COINS = exports.WINS_PER_BONUS = exports.MAXIMUM_BET = exports.CHANNEL_POINTS_TO_COINS_RATIO = exports.OUTCOME_COINS_MIN = void 0;
exports.OUTCOME_COINS_MIN = 100;
exports.CHANNEL_POINTS_TO_COINS_RATIO = 1;
exports.MAXIMUM_BET = 50000;
exports.WINS_PER_BONUS = 50;
exports.WIN_BONUS_COINS = 1000;
const channelPointsToCoins = (val) => Math.floor(val * exports.CHANNEL_POINTS_TO_COINS_RATIO);
exports.channelPointsToCoins = channelPointsToCoins;
const isValidBetAmount = (val) => val > 0 && val <= exports.MAXIMUM_BET;
exports.isValidBetAmount = isValidBetAmount;
const fillPointGaps = (points) => {
    const filled = [];
    points.forEach((p, i) => {
        if (i > 0 && typeof p.value === undefined) {
            filled.push({ ...p, value: filled[i - 1].value });
        }
        else {
            filled.push(p);
        }
    });
    return filled;
};
exports.fillPointGaps = fillPointGaps;
//# sourceMappingURL=predictionUtils.js.map