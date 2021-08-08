import { Progress } from '@chakra-ui/react';
import { UnixEpochTime } from '@stream-speculator/common';
import { useEffect, useState } from 'react';

const getValue = (start: UnixEpochTime, end: UnixEpochTime): number => {
  const fraction = (end - Date.now()) / (end - start);
  return fraction * 100;
};
const PredictionProgress = ({
  start,
  end,
}: {
  start: UnixEpochTime;
  end: UnixEpochTime;
}) => {
  const [value, setValue] = useState(getValue(start, end));
  useEffect(() => {
    const i = setInterval(() => {
      const val = getValue(start, end);
      if (val < 1) {
        clearInterval(i);
        setValue(0);
      } else {
        setValue(val);
      }
    }, 100);

    return () => clearInterval(i);
  }, [start, end]);
  return (
    <Progress hasStripe isAnimated={true} value={value} min={0} max={100} />
  );
};

export default PredictionProgress;
