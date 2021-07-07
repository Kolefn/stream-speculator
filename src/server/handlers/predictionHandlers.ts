/* eslint-disable import/prefer-default-export */
import { checkSchema } from 'express-validator';
import DBClient from '../../common/DBClient';
import {
  Prediction, PredictionPeriod, PredictionPosition, PredictionRequest, StreamMetricPoint, StreamMetricType,
} from '../../common/types';
import APIResponse from '../APIResponse';
import Scheduler from '../Scheduler';

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
  period: {
    in: 'body',
    isInt: true,
    toInt: true,
    isIn: {
      options: Object.values(PredictionPeriod),
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
  const points = await clients.db.history<StreamMetricPoint>(
    DBClient.streamMetric(request.channelId, request.metric),
    Math.max(PredictionPeriod.FiveMinute, request.period * 1000),
  );

  return new APIResponse({
    status: 200,
    data: {
      ...request,
      id: '',
      wager: 0,
      maxReturn: 0,
      targetMetricValue: 0,
      startMetricValue: 0,
      expiresAt: 0,
    },
  });
};
