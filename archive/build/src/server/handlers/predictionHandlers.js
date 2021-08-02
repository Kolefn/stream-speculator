"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTaskCreatePrediction = exports.handleTaskPredictionEvent = exports.handleBet = exports.betRequestValidator = void 0;
const schema_1 = require("express-validator/src/middlewares/schema");
const DBClient_1 = __importDefault(require("../../common/DBClient"));
const predictionUtils_1 = require("../../common/predictionUtils");
const types_1 = require("../../common/types");
const augmentation_1 = require("../augmentation");
const NotFoundError_1 = __importDefault(require("../errors/NotFoundError"));
const UnAuthorizedError_1 = __importDefault(require("../errors/UnAuthorizedError"));
const Scheduler_1 = require("../Scheduler");
const NULL_PREDICTION = {
    winningOutcomeId: null,
    status: null,
    endedAt: null,
    augmentation: null,
};
exports.betRequestValidator = schema_1.checkSchema({
    coins: {
        in: 'body',
        isInt: true,
        custom: {
            options: predictionUtils_1.isValidBetAmount,
        },
    },
    predictionId: {
        in: 'body',
        isString: true,
        isNumeric: true,
    },
    outcomeId: {
        in: 'body',
        isString: true,
        isNumeric: true,
    },
});
const handleBet = async (session, request, db) => {
    if (!session) {
        throw new UnAuthorizedError_1.default('Bet');
    }
    const createBetAndUpdateCounters = DBClient_1.default.defineVars({
        existingBet: DBClient_1.default.getIfMatch(DBClient_1.default.bets.withRefsTo([
            {
                collection: DBClient_1.default.predictions,
                id: request.predictionId,
            },
            {
                collection: DBClient_1.default.outcomes,
                id: request.outcomeId,
            },
            {
                collection: DBClient_1.default.users,
                id: session.userId,
            },
        ])),
        bet: DBClient_1.default.ifNull(DBClient_1.default.useVar('existingBet'), DBClient_1.default.create(DBClient_1.default.bets, { ...request, userId: session.userId }, DBClient_1.default.fromNow(12, 'hours')), DBClient_1.default.addToDocFields(DBClient_1.default.varSelect('existingBet', ['ref']), { coins: request.coins })),
    }, DBClient_1.default.batch(DBClient_1.default.defineVars({
        updatedPrediction: DBClient_1.default.update(DBClient_1.default.predictions.doc(request.predictionId), {
            id: request.predictionId,
            outcomes: {
                [request.outcomeId]: {
                    coins: DBClient_1.default.add(DBClient_1.default.varSelect('fieldDoc', ['data', 'outcomes', request.outcomeId, 'coins']), request.coins),
                    coinUsers: DBClient_1.default.add(DBClient_1.default.varSelect('fieldDoc', ['data', 'outcomes', request.outcomeId, 'coinUsers']), DBClient_1.default.ifNull(DBClient_1.default.useVar('existingBet'), 1, 0)),
                },
            },
        }),
    }, DBClient_1.default.update(DBClient_1.default.varSelect('fieldDoc', ['data', 'channelRef']), { predictionUpdate: DBClient_1.default.merge(NULL_PREDICTION, DBClient_1.default.varSelect('updatedPrediction', ['data'])) })), DBClient_1.default.useVar('bet')));
    const result = await db.exec(DBClient_1.default.ifFieldGTE(DBClient_1.default.predictions.doc(request.predictionId), 'locksAt', Date.now() + 1000, DBClient_1.default.userCoinPurchase(session.userId, request.coins, createBetAndUpdateCounters), null));
    if (!result) {
        throw new Error('Insufficient funds, or prediction is locked or does not exist.');
    }
    return { ...request, userId: session.userId, id: result.ref.id };
};
exports.handleBet = handleBet;
const handleTaskPredictionEvent = async (event, db, scheduler) => {
    if (event.type === 'begin') {
        await db.exec(DBClient_1.default.batch(DBClient_1.default.update(DBClient_1.default.channels.doc(event.prediction.channelId), {
            predictionUpdate: {
                ...NULL_PREDICTION,
                ...event.prediction,
            },
        }), DBClient_1.default.create(DBClient_1.default.predictions, event.prediction, DBClient_1.default.fromNow(12, 'hours'))));
        if (event.prediction.augmentation) {
            console.log('msUntilPredictionLock', event.prediction.locksAt - Date.now());
            await scheduler.schedule({
                type: Scheduler_1.TaskType.PredictionEvent,
                data: {
                    type: 'lock',
                    prediction: event.prediction,
                },
                when: [
                    {
                        timestamp: event.prediction.locksAt,
                    },
                ],
            });
        }
    }
    else if (event.type === 'progress' || event.type === 'lock') {
        if (event.prediction.augmentation && event.type === 'lock') {
            const viewerCount = await db.exec(DBClient_1.default.getField(DBClient_1.default.streamMetric(event.prediction.channelId, types_1.StreamMetricType.ViewerCount), 'value'));
            await scheduler.scheduleBatch([{
                    type: Scheduler_1.TaskType.PredictionEvent,
                    data: {
                        type: 'end',
                        prediction: {
                            ...event.prediction,
                            winningOutcomeId: augmentation_1.getWinningOutcomeId(event.prediction, viewerCount),
                            status: 'resolved',
                        },
                    },
                }, {
                    type: Scheduler_1.TaskType.CreatePrediction,
                    data: {
                        channelId: event.prediction.channelId,
                    },
                }]);
            return;
        }
        const outcomes = {};
        Object.keys(event.prediction.outcomes).forEach((id) => {
            const item = event.prediction.outcomes[id];
            outcomes[id] = {
                channelPointUsers: item.channelPointUsers,
                channelPoints: item.channelPoints,
            };
        });
        await db.exec(DBClient_1.default.defineVars({
            updatedPrediction: DBClient_1.default.update(DBClient_1.default.predictions.doc(event.prediction.id), { outcomes }),
        }, DBClient_1.default.update(DBClient_1.default.channels.doc(event.prediction.channelId), { predictionUpdate: DBClient_1.default.merge(NULL_PREDICTION, DBClient_1.default.varSelect('updatedPrediction', ['data'])) })));
    }
    else if (event.type === 'end') {
        const update = {
            winningOutcomeId: event.prediction.winningOutcomeId,
            status: event.prediction.status,
            endedAt: Date.now(),
        };
        const predictionId = event.prediction.id;
        const { status, outcomes, winningOutcomeId } = await db.exec(DBClient_1.default.defineVars({
            updatedPrediction: DBClient_1.default.update(DBClient_1.default.predictions.doc(event.prediction.id), update),
        }, DBClient_1.default.batch(DBClient_1.default.update(DBClient_1.default.channels.doc(event.prediction.channelId), { predictionUpdate: DBClient_1.default.merge(NULL_PREDICTION, DBClient_1.default.varSelect('updatedPrediction', ['data'])) }), DBClient_1.default.varSelect('updatedPrediction', ['data']))));
        const payoutRatios = {};
        if (status === 'resolved') {
            if (!winningOutcomeId || !outcomes[winningOutcomeId]) {
                throw new Error(`Winning outcome not found for: ${winningOutcomeId}`);
            }
            const winningOutcome = outcomes[winningOutcomeId];
            const winningOutcomePool = predictionUtils_1.channelPointsToCoins(winningOutcome.channelPoints)
                + winningOutcome.coins - predictionUtils_1.OUTCOME_COINS_MIN;
            const losingOutcomesPool = Object.values(outcomes)
                .filter((item) => item.id !== winningOutcomeId)
                .map((item) => predictionUtils_1.channelPointsToCoins(item.channelPoints) + item.coins)
                .reduce((sum, coins) => coins + sum, 0);
            Object.keys(outcomes).forEach((id) => {
                payoutRatios[id] = 0;
            });
            payoutRatios[winningOutcomeId] = 1 + (losingOutcomesPool / winningOutcomePool);
        }
        else {
            Object.keys(outcomes).forEach((id) => {
                payoutRatios[id] = 1;
            });
        }
        await db.forEachPage(DBClient_1.default.bets.withRefsTo([{ collection: DBClient_1.default.predictions, id: predictionId }]), async (page) => {
            const updates = DBClient_1.default.deRefPage(page)
                .filter((bet) => payoutRatios[bet.outcomeId] > 0)
                .map((bet) => DBClient_1.default.addToDocFields(DBClient_1.default.users.doc(bet.userId), {
                coins: DBClient_1.default.add(Math.floor(bet.coins * payoutRatios[bet.outcomeId]), DBClient_1.default.ifMultipleOf(DBClient_1.default.add(DBClient_1.default.varSelect('fieldsDoc', ['data', 'wins'], 0), bet.outcomeId === winningOutcomeId ? 1 : 0), predictionUtils_1.WINS_PER_BONUS, predictionUtils_1.WIN_BONUS_COINS, 0)),
                wins: bet.outcomeId === winningOutcomeId ? 1 : 0,
            }));
            if (updates.length === 0) {
                return;
            }
            await db.exec(DBClient_1.default.batch(...updates));
        }, { size: 250, getDocs: true });
    }
};
exports.handleTaskPredictionEvent = handleTaskPredictionEvent;
const handleTaskCreatePrediction = async (channelId, db, twitch, scheduler) => {
    const stream = await twitch.api.helix.streams.getStreamByUserId(channelId);
    if (!stream) {
        throw new NotFoundError_1.default(`TwitchStream with channel id ${channelId}`);
    }
    scheduler.schedule({
        type: Scheduler_1.TaskType.PredictionEvent,
        data: {
            type: 'begin',
            prediction: augmentation_1.createPrediction(stream.userId, await db.exec(DBClient_1.default.getField(DBClient_1.default.streamMetric(channelId, types_1.StreamMetricType.ViewerCount), 'value')), stream.startDate.getTime()),
        },
    });
};
exports.handleTaskCreatePrediction = handleTaskCreatePrediction;
//# sourceMappingURL=predictionHandlers.js.map