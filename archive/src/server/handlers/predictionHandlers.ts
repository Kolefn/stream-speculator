/* eslint-disable import/prefer-default-export */
import { checkSchema } from 'express-validator/src/middlewares/schema';
import DB, { FaunaDoc } from '../../common/DBClient';
import {
  channelPointsToCoins, isValidBetAmount, OUTCOME_COINS_MIN, WINS_PER_BONUS, WIN_BONUS_COINS,
} from '../../common/predictionUtils';
import {
  Prediction,
  PredictionOutcome,
  Bet,
  BetRequest,
  StreamMetricType,
} from '../../common/types';
import { createPrediction, getWinningOutcomeId } from '../augmentation';
import NotFoundError from '../errors/NotFoundError';
import UnAuthorizedError from '../errors/UnAuthorizedError';
import Scheduler, { TaskType } from '../Scheduler';
import TwitchClient from '../TwitchClient';
import { AuthSession } from './authHandlers';

type PredictionEvent = {
  type: 'begin' | 'progress' | 'lock' | 'end',
  prediction: Prediction;
};

const NULL_PREDICTION = {
  winningOutcomeId: null,
  status: null,
  endedAt: null,
  augmentation: null,
};

export const betRequestValidator = checkSchema({
  coins: {
    in: 'body',
    isInt: true,
    custom: {
      options: isValidBetAmount,
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

export const handleBet = async (
  session: AuthSession | null,
  request: BetRequest,
  db: DB,
) : Promise<Bet> => {
  if (!session) {
    throw new UnAuthorizedError('Bet');
  }
  const createBetAndUpdateCounters = DB.defineVars({
    existingBet: DB.getIfMatch(DB.bets.withRefsTo([
      {
        collection: DB.predictions,
        id: request.predictionId,
      },
      {
        collection: DB.outcomes,
        id: request.outcomeId,
      },
      {
        collection: DB.users,
        id: session.userId,
      },
    ])),
    bet: DB.ifNull(
      DB.useVar('existingBet'),
      DB.create(DB.bets, { ...request, userId: session.userId }, DB.fromNow(12, 'hours')),
      DB.addToDocFields(DB.varSelect('existingBet', ['ref']), { coins: request.coins }),
    ),
  }, DB.batch(
    DB.defineVars({
      updatedPrediction: DB.update(DB.predictions.doc(request.predictionId), {
        id: request.predictionId,
        outcomes: {
          [request.outcomeId]: {
            coins: DB.add(
              DB.varSelect('fieldDoc', ['data', 'outcomes', request.outcomeId, 'coins']),
              request.coins,
            ),
            coinUsers: DB.add(
              DB.varSelect('fieldDoc', ['data', 'outcomes', request.outcomeId, 'coinUsers']),
              DB.ifNull(DB.useVar('existingBet'), 1, 0),
            ),
          },
        },
      }),
    }, DB.update(
      DB.varSelect('fieldDoc', ['data', 'channelRef']),
      { predictionUpdate: DB.merge(NULL_PREDICTION, DB.varSelect('updatedPrediction', ['data'])) },
    )),
    DB.useVar('bet'),
  ));

  const result = await db.exec<FaunaDoc | null>(
    DB.ifFieldGTE(
      DB.predictions.doc(request.predictionId),
      'locksAt',
      Date.now() + 1000,
      DB.userCoinPurchase(
        session.userId,
        request.coins,
        createBetAndUpdateCounters,
      ),
      null,
    ),
  );

  if (!result) {
    throw new Error('Insufficient funds, or prediction is locked or does not exist.');
  }

  return { ...request, userId: session.userId, id: result.ref.id };
};

export const handleTaskPredictionEvent = async (
  event: PredictionEvent,
  db: DB,
  scheduler: Scheduler,
) : Promise<void> => {
  if (event.type === 'begin') {
    await db.exec(
      DB.batch(
        DB.update(
          DB.channels.doc(event.prediction.channelId),
          {
            predictionUpdate: {
              ...NULL_PREDICTION,
              ...event.prediction,
            },
          },
        ),
        DB.create(DB.predictions, event.prediction, DB.fromNow(12, 'hours')),
      ),
    );

    if (event.prediction.augmentation) {
      await scheduler.schedule({
        type: TaskType.PredictionEvent,
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
  } else if (event.type === 'progress' || event.type === 'lock') {
    if (event.prediction.augmentation && event.type === 'lock') {
      const viewerCount = await db.exec<number>(
        DB.getField(
          DB.streamMetric(event.prediction.channelId, StreamMetricType.ViewerCount),
          'value',
        ),
      );
      await scheduler.scheduleBatch([{
        type: TaskType.PredictionEvent,
        data: {
          type: 'end',
          prediction: {
            ...event.prediction,
            winningOutcomeId: getWinningOutcomeId(
              event.prediction,
              viewerCount,
            ),
            status: 'resolved',
          },
        },
      }, {
        type: TaskType.CreatePrediction,
        data: {
          channelId: event.prediction.channelId,
        },
      }]);
      return;
    }

    const outcomes: { [key:string]: Partial<PredictionOutcome> } = {};

    Object.keys(event.prediction.outcomes).forEach(
      (id: string) => {
        const item = event.prediction.outcomes[id];
        outcomes[id] = {
          channelPointUsers: item.channelPointUsers,
          channelPoints: item.channelPoints,
        };
      },
    );

    await db.exec(
      DB.defineVars({
        updatedPrediction: DB.update(DB.predictions.doc(event.prediction.id), { outcomes }),
      },
      DB.update(
        DB.channels.doc(event.prediction.channelId),
        { predictionUpdate: DB.merge(NULL_PREDICTION, DB.varSelect('updatedPrediction', ['data'])) },
      )),
    );
  } else if (event.type === 'end') {
    const update: Partial<Prediction> = {
      winningOutcomeId: event.prediction.winningOutcomeId,
      status: event.prediction.status,
      endedAt: Date.now(),
    };

    const predictionId = event.prediction.id;
    const { status, outcomes, winningOutcomeId } = await db.exec<Prediction>(
      DB.defineVars({
        updatedPrediction: DB.update(DB.predictions.doc(event.prediction.id), update),
      },
      DB.batch(
        DB.update(
          DB.channels.doc(event.prediction.channelId),
          { predictionUpdate: DB.merge(NULL_PREDICTION, DB.varSelect('updatedPrediction', ['data'])) },
        ),
        DB.varSelect('updatedPrediction', ['data']),
      )),
    );

    const payoutRatios: { [key:string]: number } = {};
    if (status === 'resolved') {
      if (!winningOutcomeId || !outcomes[winningOutcomeId]) {
        throw new Error(`Winning outcome not found for: ${winningOutcomeId}`);
      }

      const winningOutcome = outcomes[winningOutcomeId];
      const winningOutcomePool = channelPointsToCoins(winningOutcome.channelPoints)
      + winningOutcome.coins - OUTCOME_COINS_MIN;
      const losingOutcomesPool = Object.values(outcomes)
        .filter((item: PredictionOutcome) => item.id !== winningOutcomeId)
        .map((item: PredictionOutcome) => channelPointsToCoins(item.channelPoints) + item.coins)
        .reduce((sum: number, coins: number) => coins + sum, 0);

      // const participantCount = Object.values(outcomes).reduce(
      //   (sum, outcome) => sum + outcome.coinUsers + outcome.channelPointUsers,
      //   0,
      // );

      Object.keys(outcomes).forEach((id) => {
        payoutRatios[id] = 0;
      });

      payoutRatios[winningOutcomeId] = 1 + (losingOutcomesPool / winningOutcomePool);
    } else {
      // refund
      Object.keys(outcomes).forEach((id) => {
        payoutRatios[id] = 1;
      });
    }

    await db.forEachPage<FaunaDoc>(
      DB.bets.withRefsTo([{ collection: DB.predictions, id: predictionId }]),
      async (page) => {
        const updates = DB.deRefPage<Bet>(page)
          .filter((bet) => payoutRatios[bet.outcomeId] > 0)
          .map((bet) => DB.addToDocFields(
            DB.users.doc(bet.userId),
            {
              coins: DB.add(
                Math.floor(bet.coins * payoutRatios[bet.outcomeId]),
                DB.ifMultipleOf(
                  DB.add(
                    DB.varSelect('fieldsDoc', ['data', 'wins'], 0),
                    bet.outcomeId === winningOutcomeId ? 1 : 0,
                  ),
                  WINS_PER_BONUS,
                  WIN_BONUS_COINS,
                  0,
                ),
              ),
              wins: bet.outcomeId === winningOutcomeId ? 1 : 0,
            },
          ));
        if (updates.length === 0) {
          return;
        }
        await db.exec(
          DB.batch(
            ...updates,
          ),
        );
      },
      { size: 250, getDocs: true },
    );
  }
};

export const handleTaskCreatePrediction = async (
  channelId: string,
  db: DB,
  twitch: TwitchClient,
  scheduler: Scheduler,
) : Promise<void> => {
  const stream = await twitch.api.helix.streams.getStreamByUserId(channelId);
  if (!stream) {
    throw new NotFoundError(`TwitchStream with channel id ${channelId}`);
  }

  scheduler.schedule(
    {
      type: TaskType.PredictionEvent,
      data: {
        type: 'begin',
        prediction: createPrediction(
          stream.userId,
          await db.exec<number>(
            DB.getField(
              DB.streamMetric(channelId, StreamMetricType.ViewerCount),
              'value',
            ),
          ),
          stream.startDate.getTime(),
        ),
      },
    },
  );
};
