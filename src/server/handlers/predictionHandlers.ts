/* eslint-disable import/prefer-default-export */
import { checkSchema } from 'express-validator/src/middlewares/schema';
import DB, { FaunaDoc } from '../../common/DBClient';
import { channelPointsToCoins, isValidBetAmount } from '../../common/predictionUtils';
import {
  Prediction,
  PredictionOutcome,
  Bet,
  BetRequest,
} from '../../common/types';
import UnAuthorizedError from '../errors/UnAuthorizedError';
import { AuthSession } from './authHandlers';

type PredictionEvent = {
  type: 'channel.prediction.begin' | 'channel.prediction.progress'
  | 'channel.prediction.lock' | 'channel.prediction.end',
  prediction: Prediction;
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

  const result = await db.exec<FaunaDoc | null>(
    DB.ifFieldGTE(
      DB.predictions.doc(request.predictionId),
      'locksAt', DB.fromNow(1, 'seconds'),
      DB.userCoinPurchase(
        session.userId,
        request.coins,
        DB.create(DB.bets, { ...request, userId: session.userId }, DB.fromNow(1, 'days')),
      ),
      null,
    ),
  );

  if (!result) {
    throw new Error('Insufficient funds, or prediction is locked or does not exist.');
  }

  return { ...request, userId: session.userId, id: result.ref.id };
};

export const handleTaskPredictionEvent = async (event: PredictionEvent, db: DB) => {
  if (event.type === 'channel.prediction.begin') {
    await db.exec(
      DB.batch(
        DB.update(
          DB.channels.doc(event.prediction.channelId),
          { predictionUpdate: event.prediction },
        ),
        DB.create(DB.predictions, event.prediction, DB.fromNow(1, 'days')),
      ),
    );
  } else if (event.type === 'channel.prediction.progress' || event.type === 'channel.prediction.lock') {
    const outcomes = event.prediction.outcomes.map(
      (item: PredictionOutcome) : Partial<PredictionOutcome> => ({
        channelPointUsers: item.channelPointUsers,
        channelPoints: item.channelPoints,
      }),
    );

    await db.exec(
      DB.batch(
        DB.update(DB.predictions.doc(event.prediction.id), { outcomes }),
        DB.update(DB.channels.doc(event.prediction.channelId),
          { predictionUpdate: { id: event.prediction.id, outcomes } }),
      ),
    );
  } else if (event.type === 'channel.prediction.end') {
    const update = {
      winningOutcomeId: event.prediction.winningOutcomeId,
      status: event.prediction.status,
    };

    const predictionId = event.prediction.id;
    const { status, outcomes, winningOutcomeId } = DB.deRef<Prediction>(
      await db.exec<FaunaDoc>(
        DB.batch(
          DB.update(DB.channels.doc(event.prediction.channelId),
            { predictionUpdate: { id: event.prediction.id, ...update } }),
          DB.update(DB.predictions.doc(event.prediction.id), update),
        ),
      ),
    );

    const payoutRatios: { [key:string]: number } = {};
    if (status === 'resolved') {
      const winningOutcome = outcomes.find(
        (item: any) => item.id === winningOutcomeId,
      );
      if (!winningOutcome || !winningOutcomeId) {
        throw new Error(`Winning outcome not found for: ${winningOutcomeId}`);
      }

      const winningOutcomePool = channelPointsToCoins(winningOutcome.channelPoints)
      + winningOutcome.coins;
      const losingOutcomesPool = outcomes
        .filter((item: PredictionOutcome) => item.id !== winningOutcomeId)
        .map((item: PredictionOutcome) => channelPointsToCoins(item.channelPoints) + item.coins)
        .reduce((sum: number, coins: number) => coins + sum, 0);

      outcomes.forEach((item) => {
        payoutRatios[item.id] = 0;
      });

      payoutRatios[winningOutcomeId] = 1 + (losingOutcomesPool / winningOutcomePool);
    } else {
      // refund
      outcomes.forEach((item) => {
        payoutRatios[item.id] = 1;
      });
    }

    await db.forEachPage<FaunaDoc>(
      DB.bets.withRefsTo([{ collection: DB.predictions, id: predictionId }]),
      (page) => db.exec(
        DB.batch(
          ...DB.deRefPage<Bet>(page)
            .filter((bet) => payoutRatios[bet.outcomeId] > 0)
            .map((bet) => DB.updateUserCoins(
              bet.userId,
              Math.floor(bet.coins * payoutRatios[bet.outcomeId]),
            )),
        ),
      ),
      { size: 250 },
    );
  }
};
