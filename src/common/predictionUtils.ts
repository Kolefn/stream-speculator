import {
  StreamMetricPoint,
} from './types';

type Points = StreamMetricPoint[];

export const OUTCOME_COINS_MIN = 100;
export const CHANNEL_POINTS_TO_COINS_RATIO = 1;
export const MAXIMUM_BET = 50000;

export const channelPointsToCoins = (val: number)
: number => Math.floor(val * CHANNEL_POINTS_TO_COINS_RATIO);

export const isValidBetAmount = (val: number) : boolean => val > 0 && val <= MAXIMUM_BET;

export const fillPointGaps = (points: Points)
: Points => {
  const filled: Points = [];
  points.forEach((p, i) => {
    if (i > 0 && typeof p.value === undefined) {
      filled.push({ ...p, value: filled[i - 1].value });
    } else {
      filled.push(p);
    }
  });

  return filled;
};

// export const getProjectedDelta = (points: Points, window: PredictionWindow)
// : PointsDelta => {
//   if (points.length <= 1) {
//     return { value: 0, fraction: 1, positive: true };
//   }
//   const left = points[0];
//   const right = points[points.length - 1];
//   const lv = left.value;
//   const rv = right.value;
//   const scale = window / (right.timestamp - left.timestamp);
//   return {
//     value: (rv - lv) * scale,
//     fraction: ((rv / lv) - 1) * scale,
//     positive: rv >= lv,
//   };
// };
