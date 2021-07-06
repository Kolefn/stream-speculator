import { useState, useEffect } from 'react';
import DB from '../common/DBClient';
import { StreamMetric, StreamMetricType, StreamMetricPoint } from '../common/types';
import useDBClient from './useDBClient';

export default (type: StreamMetricType, channelId?: string, initial?: StreamMetricPoint[])
: [StreamMetricPoint[], Error | null] => {
  const [client, error] = useDBClient();
  const [history, setHistory] = useState<StreamMetricPoint[]>([]);

  useEffect(() => {
    if (channelId && client) {
      const unsub = client.onChange(DB.streamMetric(channelId, type), (latest) => {
        const data = (latest.document.data as StreamMetric);
        if (data.value) {
          setHistory([...history, data]);
        }
      });
      return () => unsub();
    }
    return undefined;
  }, [client, channelId, history]);

  useEffect(() => {
    if (initial) {
      setHistory(initial.filter((item) => !Number.isNaN(item.value)));
    }
  }, [initial]);

  return [history, error];
};
