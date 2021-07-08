import {
  PredictionBase, PredictionPosition, PredictionWindow, StreamMetricPoint,
} from './types';

type PointsDelta = { value: number, fraction: number, positive: boolean };
type Points = StreamMetricPoint[];
const WAGER_PER_WINDOW_MINUTE = 100;

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

export const getProjectedDelta = (points: Points, window: PredictionWindow)
: PointsDelta => {
  if (points.length <= 1) {
    return { value: 0, fraction: 1, positive: true };
  }
  const left = points[0];
  const right = points[points.length - 1];
  const lv = left.value;
  const rv = right.value;
  const scale = window / (right.timestamp - left.timestamp);
  return {
    value: (rv - lv) * scale,
    fraction: ((rv / lv) - 1) * scale,
    positive: rv >= lv,
  };
};

export const getMaxReturnLossMetricVals = (window: Points, prediction: PredictionBase)
: { maxReturnMetricVal: number, maxLossMetricVal: number } => {
  const current = window[window.length - 1].value;
  const margin = prediction.threshold - current;
  if (prediction.position === PredictionPosition.Above) {
    if (margin >= 0) {
      return { maxReturnMetricVal: current + (margin * 2), maxLossMetricVal: current };
    }

    return { maxReturnMetricVal: current, maxLossMetricVal: current + (margin * 2) };
  }

  if (margin >= 0) {
    return { maxReturnMetricVal: current, maxLossMetricVal: current + (margin * 2) };
  }
  return { maxReturnMetricVal: current + (margin * 2), maxLossMetricVal: current };
};

export const getRiskFactor = (window: Points, prediction: PredictionBase) : number => {
  const { threshold, position } = prediction;

  const current = window[window.length - 1].value;
  const delta = getProjectedDelta(window, prediction.window);
  const projected = current + delta.value;
  const above = position === PredictionPosition.Above;

  const projectedFraction = (projected / threshold) - 1;
  const thresholdFraction = (threshold / projected) - 1;

  if (above) {
    if (projected >= threshold) {
      return 1 - Math.min(1, projectedFraction);
    }
    return Math.min(1, thresholdFraction);
  }
  if (projected >= threshold) {
    return Math.min(1, projectedFraction);
  }
  return 1 - Math.min(1, thresholdFraction);
};

export const getWindowPoints = (points: Points, window: PredictionWindow)
: Points => {
  const right = points[points.length - 1];
  const leftIndex = points.findIndex((p) => right.timestamp - p.timestamp <= window);
  if (leftIndex === -1) {
    return [right];
  }

  return points.slice(leftIndex);
};

export const getWager = (windowSeconds: PredictionWindow) : number => {
  const minutes = windowSeconds / 60;
  return minutes * WAGER_PER_WINDOW_MINUTE;
};

export const getMaxReturn = (window: Points, prediction: PredictionBase) : number => {
  const risk = getRiskFactor(window, prediction);
  const wager = getWager(prediction.window);
  return wager + (wager * risk);
};
