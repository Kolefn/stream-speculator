import crypto from 'crypto';
import { OUTCOME_COINS_MIN } from '../common/predictionUtils';
import {
  AugmentationType, Milliseconds, Prediction, UnixEpochTime,
} from '../common/types';

const PREDICTION_ID_EPOCH_MS = 854150400000; // 1/25/1997 0h 0m 0s

type PredictionDuration = {
  ms: Milliseconds;
  label: string;
};

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

const DURATIONS: { [key: string] : PredictionDuration } = {
  FIVE_MINUTES: {
    ms: FIVE_MINUTES_MS,
    label: '5 minutes',
  },
};

const createPredictionId = ()
: string => {
  const ts = Date.now() - PREDICTION_ID_EPOCH_MS;
  const rand = parseInt(crypto.randomBytes(2).toString('hex'), 16);
  return `${ts}${rand}`;
};

const moreLessEqualViewerCount = (
  channelId: string,
  viewerCount: number,
  duration: PredictionDuration,
) : Prediction => ({
  augmentation: {
    type: AugmentationType.MoreLessEqual,
    data: viewerCount,
  },
  id: createPredictionId(),
  channelId,
  title: `Viewer count in ${duration.label}.`,
  startedAt: Date.now(),
  locksAt: Date.now() + duration.ms,
  outcomes: {
    0: {
      id: '0',
      title: `More than ${viewerCount}`,
      color: 'pink',
      coinUsers: 0,
      coins: OUTCOME_COINS_MIN,
      channelPointUsers: 0,
      channelPoints: 0,
    },
    1: {
      id: '1',
      title: `Less than ${viewerCount}`,
      color: 'blue',
      coinUsers: 0,
      coins: OUTCOME_COINS_MIN,
      channelPointUsers: 0,
      channelPoints: 0,
    },
    2: {
      id: '2',
      title: `Exactly ${viewerCount}`,
      color: 'green',
      coinUsers: 0,
      coins: OUTCOME_COINS_MIN,
      channelPointUsers: 0,
      channelPoints: 0,
    },
  },
});

const increaseTargetViewerCount = (
  channelId: string,
  uptime: number,
  viewerCount: number,
  duration: PredictionDuration,
) : Prediction => {
  const rate = (viewerCount / uptime) * (duration.ms / uptime) * (uptime >= TEN_MINUTES_MS ? 1 : 2);
  const target = Math.floor(viewerCount + rate);
  return ({
    augmentation: {
      type: AugmentationType.IncreaseTarget,
      data: target,
    },
    id: createPredictionId(),
    channelId,
    title: `Reach ${target} or more viewers in ${duration.label}.`,
    startedAt: Date.now(),
    locksAt: Date.now() + duration.ms,
    outcomes: {
      0: {
        id: '0',
        title: 'Yes',
        color: 'pink',
        coinUsers: 0,
        coins: OUTCOME_COINS_MIN,
        channelPointUsers: 0,
        channelPoints: 0,
      },
      1: {
        id: '1',
        title: 'No',
        color: 'blue',
        coinUsers: 0,
        coins: OUTCOME_COINS_MIN,
        channelPointUsers: 0,
        channelPoints: 0,
      },
    },
  });
};

export const createPrediction = (
  channelId: string,
  viewerCount: number,
  startTime: UnixEpochTime,
)
: Prediction => {
  const uptime = Date.now() - startTime;
  const clampedViewerCount = Math.max(viewerCount, 1);
  if (uptime >= THIRTY_MINUTES_MS) {
    return moreLessEqualViewerCount(channelId, clampedViewerCount, DURATIONS.FIVE_MINUTES);
  }
  return increaseTargetViewerCount(channelId, uptime, clampedViewerCount, DURATIONS.FIVE_MINUTES);
};

export const getWinningOutcomeId = (prediction: Prediction, currentViewCount: number) : string => {
  if (!prediction.augmentation) {
    throw new Error('Prediction is not an augmentation');
  }

  const { type, data } = prediction.augmentation;

  if (type === AugmentationType.MoreLessEqual) {
    const threshold: number = data;
    if (threshold === currentViewCount) {
      return '2';
    } if (threshold > currentViewCount) {
      return '1';
    }
    return '0';
  } if (type === AugmentationType.IncreaseTarget) {
    const target: number = data;
    return currentViewCount >= target ? '0' : '1';
  }

  throw new Error(`Cannot get winning outcome of unkown augmentation type ${type}.`);
};
