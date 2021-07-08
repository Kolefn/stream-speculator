/* eslint-disable import/prefer-default-export */
import { checkSchema } from 'express-validator';
import DBClient from '../../common/DBClient';
import {
  Prediction, PredictionWindow,
  PredictionPosition, PredictionRequest,
  StreamMetricPoint, StreamMetricType,
} from '../../common/types';
import APIResponse from '../APIResponse';
import Scheduler from '../Scheduler';
import {
  fillPointGaps,
  getWindowPoints,
  getRiskFactor,
  getMaxReturnLossMetricVals,
  getWager,
  getMaxReturn,
} from '../../common/predictionUtils';

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

export const handlePrediction = async (request: PredictionRequest,
  clients: { db: DBClient, scheduler: Scheduler })
: Promise<APIResponse<Prediction>> => {
  let points = await clients.db.history<StreamMetricPoint>(
    DBClient.streamMetric(request.channelId, request.metric),
    (request.window + POINT_HISTORY_BUFFER_SECONDS) * 1000,
  );
  points = fillPointGaps(points);
  points = getWindowPoints(points, request.window);
  const { maxReturnMetricVal, maxLossMetricVal } = getMaxReturnLossMetricVals(points, request);
  const wager = getWager(request.window);
  const maxReturn = getMaxReturn(points, request);
  const prediction: Prediction = {
    ...request,
    id: '',
    wager,
    maxReturn,
    maxReturnMetricVal,
    maxLossMetricVal,
    startMetricVal: points[points.length - 1].value,
    createdAt: Date.now(),
  };
  return new APIResponse<Prediction>({
    status: 200,
    data: prediction,
  });
};
