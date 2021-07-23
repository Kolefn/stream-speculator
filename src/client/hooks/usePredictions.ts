import { useEffect, useRef, useState } from 'react';
import DBClient from '../../common/DBClient';
import { Prediction, PredictionOutcome, TwitchChannel } from '../../common/types';
import useDBChangeListener from './useDBChangeListener';

const updatePrediction = (
  prediction: Prediction,
  update: Partial<Prediction>,
) : Prediction => ({
  ...prediction,
  ...update,
  outcomes: update.outcomes ? Object.keys(prediction.outcomes).reduce((m: any, id) => {
    // eslint-disable-next-line no-param-reassign
    m[id] = {
      ...prediction.outcomes[id],
      ...((update.outcomes as any as { [key: string]: PredictionOutcome })[id] ?? {}),
    };

    return m;
  }, {}) : prediction.outcomes,
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
