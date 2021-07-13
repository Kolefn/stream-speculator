import { useState, useEffect } from 'react';
import DB from '../common/DBClient';
import { fillPointGaps } from '../common/predictionUtils';
import { StreamMetric, StreamMetricType, StreamMetricPoint } from '../common/types';
import useDBChangeListener from './useDBChangeListener';

export default (type: StreamMetricType, channelId?: string, initial?: StreamMetricPoint[])
: [StreamMetricPoint[], Error | null] => {
  const [history, setHistory] = useState<StreamMetricPoint[]>([]);

  const [data, error] = useDBChangeListener<StreamMetric>(
    channelId ? DB.streamMetric(channelId, type) : undefined,
  );

  useEffect(() => {
    if (data) {
      setHistory(fillPointGaps([...history, data]));
    }
  }, [data]);

  useEffect(() => {
    if (initial) {
      setHistory(fillPointGaps(initial));
    }
  }, [initial]);

  return [history, error];
};
