import React, { useCallback } from 'react';
import { Prediction, PredictionOutcome } from '../../common/types';
import { postBet } from '../api/endpoints';

const OutcomeButton = (props: { data: PredictionOutcome, onClick: (id: string) => void }) => {
  const { data, onClick } = props;
  return (
    <button type="button" style={{ backgroundColor: data.color }} onClick={() => onClick(data.id)}>
      <p>{data.title}</p>
    </button>
  );
};

export default (props: { prediction: Prediction }) => {
  const { prediction } = props;
  const onClick = useCallback(
    (id: string) => postBet({ outcomeId: id, predictionId: prediction.id, coins: 100 }),
    [prediction.id],
  );
  return (
    <div>
      <h2>{prediction.title}</h2>
      {Object.values(prediction.outcomes).map(
        (outcome) => <OutcomeButton key={outcome.id} data={outcome} onClick={onClick} />,
      )}
    </div>
  );
};
