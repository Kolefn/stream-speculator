/* eslint-disable import/prefer-default-export */
import { checkSchema } from 'express-validator';
import DB, { FaunaDoc, FaunaPage } from '../../common/DBClient';
import {
  Prediction, PredictionWindow,
  PredictionPosition, PredictionRequest,
  StreamMetricPoint, StreamMetricType, StreamMetric,
} from '../../common/types';
import Scheduler, { ScheduledTask, TaskType } from '../Scheduler';
import {
  fillPointGaps,
  getWindowPoints,
  getMaxReturnLossMetricVals,
  getWager,
  getMaxReturn,
  getPredictionReturn,
} from '../../common/predictionUtils';
import { AuthSession } from './authHandlers';
import UnAuthorizedError from '../errors/UnAuthorizedError';
import InsufficientFundsError from '../errors/InsufficientFundsError';
import NotFoundError from '../errors/NotFoundError';

const POINT_HISTORY_BUFFER_SECONDS = 180; // to avoid missing data at beginning of window

export const predictionRequestValidator = checkSchema({
  channelId: {
    in: 'body',
    isString: true,
  },
  metric: {
    in: 'body',
    isInt: true,
    custom: {
      options: (val) => StreamMetricType[val] !== undefined,
    },
  },
  threshold: {
    in: 'body',
    isInt: true,
  },
  position: {
    in: 'body',
    isInt: true,
    custom: {
      options: (val) => PredictionPosition[val] !== undefined,
    },
  },
  window: {
    in: 'body',
    isInt: true,
    custom: {
      options: (val) => PredictionWindow[val] !== undefined,
    },
  },
  multiplier: {
    in: 'body',
    isInt: true,
  },
});

export const handlePrediction = async (session: AuthSession | null, request: PredictionRequest,
  clients: { db: DB, scheduler: Scheduler })
: Promise<Prediction> => {
  if (!session) {
    throw new UnAuthorizedError('CreatePrediction');
  }
  const pointsPage = await clients.db.exec<FaunaPage<StreamMetricPoint>>(
    DB.ifFieldTrue(
      DB.channels.doc(request.channelId),
      'isLive',
      DB.pageOfEvents(
        DB.streamMetric(request.channelId, request.metric),
        (request.window + POINT_HISTORY_BUFFER_SECONDS) * 1000,
      ),
      null,
    ),
  );
  if (!pointsPage) {
    throw new NotFoundError('Prediction Channel');
  }
  let points = pointsPage.data;
  points = fillPointGaps(points);
  points = getWindowPoints(points, request.window);
  const { maxReturnMetricVal, maxLossMetricVal } = getMaxReturnLossMetricVals(points, request);
  const maxReturn = getMaxReturn(points, request);
  const wager = getWager(request.window);
  const result = await clients.db.exec<FaunaDoc>(
    DB.userCoinPurchase(
      session.userId,
      wager * request.multiplier,
      DB.create(DB.predictions, {
        ...request,
        userId: session.userId,
        wager,
        maxReturn,
        maxReturnMetricVal,
        maxLossMetricVal,
        startMetricVal: points[points.length - 1].value,
        createdAt: Date.now(),
      }),
    ),
  );
  if (!result) {
    throw new InsufficientFundsError('Prediction');
  }
  const prediction = DB.deRef<Prediction>(result);
  await clients.scheduler.schedule({
    type: TaskType.ProcessPrediction,
    data: prediction,
    when: [
      {
        timestamp: prediction.createdAt + (prediction.window * 1000),
      },
    ],
  });
  return prediction;
};

export const handleTaskProcessPrediction = async (
  task: ScheduledTask,
  scheduler: Scheduler,
  db: DB,
) => {
  const prediction = task.data as Prediction;
  const expiresAt = prediction.createdAt + prediction.window * 1000;
  if (expiresAt - Date.now() > 1000) {
    await scheduler.schedule(task);
  } else {
    const metricDoc = await db.exec<FaunaDoc>(
      DB.get(
        DB.streamMetric(prediction.channelId, prediction.metric),
      ),
    );
    const metric = metricDoc.data as StreamMetric;
    const payout = getPredictionReturn(prediction, metric.value) * prediction.multiplier;
    const predictionUpdate = DB.update(
      DB.predictions.doc(prediction.id),
      { endMetricVal: metric.value },
    );
    await db.exec(
      payout > 0 ? DB.batch(
        DB.updateUserCoins(prediction.userId, payout),
        predictionUpdate,
      ) : predictionUpdate,
    );
  }
};
