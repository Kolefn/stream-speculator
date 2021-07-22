import { useEffect, useRef, useState } from 'react';
import DBClient from '../../common/DBClient';
import { Prediction, TwitchChannel } from '../../common/types';
import useDBChangeListener from './useDBChangeListener';

const updatePrediction = (
  prediction: Prediction,
  update: Partial<Prediction>,
) : Prediction => ({
  ...prediction,
  ...update,
  outcomes: update.outcomes ? prediction.outcomes.map((a) => {
    const u = update.outcomes?.find((b) => b.id === a.id);
    if (u) {
      return {
        ...a,
        ...u,
      };
    }
    return a;
  }) : prediction.outcomes,
});

export default (channelId?: string, initial?: Prediction[])
: [Prediction[], Error | null] => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const lastPredictionIdRef = useRef<string | undefined>();

  const [data, error] = useDBChangeListener<TwitchChannel>(
    channelId ? DBClient.channels.doc(channelId) : undefined,
  );

  useEffect(() => {
    if (data) {
      lastPredictionIdRef.current = data.predictionUpdate?.id ?? lastPredictionIdRef.current;
      if (data.predictionUpdate?.channelId) { // is new
        setPredictions([data.predictionUpdate as Prediction, ...predictions]);
      } else if (data.predictionUpdate) {
        const pCopies = [...predictions];
        const pIndex = pCopies.findIndex((p) => p.id === lastPredictionIdRef.current);
        pCopies[pIndex] = updatePrediction(pCopies[pIndex], data.predictionUpdate);
        setPredictions(pCopies);
      }
    }
  }, [data]);

  useEffect(() => {
    if (initial) {
      setPredictions(predictions);
    }
  }, [initial]);

  return [predictions, error];
};
