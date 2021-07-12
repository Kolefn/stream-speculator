/* eslint-disable import/prefer-default-export */
import { checkSchema } from 'express-validator';
import DBClient, { FaunaDoc, FaunaPage } from '../../common/DBClient';
import {
  Prediction, PredictionWindow,
  PredictionPosition, PredictionRequest,
  StreamMetricPoint, StreamMetricType,
} from '../../common/types';
import Scheduler, { TaskType } from '../Scheduler';
import {
  fillPointGaps,
  getWindowPoints,
  getMaxReturnLossMetricVals,
  getWager,
  getMaxReturn,
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
    isNumeric: true,
  },
  metric: {
    in: 'body',
    isInt: true,
    toInt: true,
    isIn: {
      options: Object.values(StreamMetricType),
    },
  },
  threshold: {
    in: 'body',
    isInt: true,
    toInt: true,
  },
  position: {
    in: 'body',
    isInt: true,
    toInt: true,
    isIn: {
      options: Object.values(PredictionPosition),
    },
  },
  window: {
    in: 'body',
    isInt: true,
    toInt: true,
    isIn: {
      options: Object.values(PredictionWindow),
    },
  },
  multiplier: {
    in: 'body',
    isInt: true,
    toInt: true,
  },
});

export const handlePrediction = async (session: AuthSession | null, request: PredictionRequest,
  clients: { db: DBClient, scheduler: Scheduler })
: Promise<Prediction> => {
  if (!session) {
    throw new UnAuthorizedError('CreatePrediction');
  }
  const pointsPage = await clients.db.exec<FaunaPage<StreamMetricPoint>>(
    DBClient.ifFieldTrue(
      DBClient.channels.doc(request.channelId),
      'isLive',
      DBClient.pageOfEvents(
        DBClient.streamMetric(request.channelId, request.metric),
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
    DBClient.userCoinPurchase(
      session.userId,
      wager * request.multiplier,
      DBClient.create(DBClient.predictions, {
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
  const prediction = DBClient.deRef<Prediction>(result);
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
