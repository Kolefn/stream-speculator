import { Stack, Box, Heading, Divider } from '@chakra-ui/react';
import { Prediction, UnixEpochTime } from '@stream-speculator/common';
import { useChannelStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import OutcomesMenu from './OutcomesMenu';
import PredictionProgress from './PredictionProgress';

const msToWords = (ms: number) => {
  if (ms < 60000) {
    return `${Math.round(ms / 1000)}s`;
  } else {
    return `${Math.round(ms / 60000)}m`;
  }
};

const TitleCountdown = ({
  title,
  end,
}: {
  title: string;
  end: UnixEpochTime;
}) => {
  const [val, setVal] = useState(msToWords(end - Date.now()));
  useEffect(() => {
    const interval = setInterval(() => {
      setVal(msToWords(end - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [end]);

  return <>{title.replace('%', val)}</>;
};
const PredictionCardTitle = observer(({ data }: { data: Prediction }) => {
  const store = useChannelStore();
  return (
    <Stack spacing="2px">
      <Heading fontSize="xs" color="whiteAlpha.600" fontWeight="normal">
        {store.selectedOutcomeId ? 'Your Prediction' : 'Predict'}
      </Heading>
      <Heading size="md" fontWeight="normal" color="whiteAlpha.900">
        {store.selectedOutcomeId ? (
          data.outcomes[store.selectedOutcomeId].title
        ) : (
          <TitleCountdown title={data.title} end={data.locksAt} />
        )}
      </Heading>
    </Stack>
  );
});

const PredictionCard = ({ data }: { data: Prediction }) => {
  return (
    <Box borderRadius="md" bg="whiteAlpha.100" overflow="hidden">
      <Stack spacing="10px" direction="column" p="25px">
        <PredictionCardTitle data={data} />
        <Divider />
        <OutcomesMenu
          data={Object.values(data.outcomes)}
          onBet={() => new Promise((resolve) => setTimeout(resolve, 2000))}
          disabled={data.status !== 'active'}
        />
      </Stack>
      <PredictionProgress start={data.startedAt} end={data.locksAt} />
    </Box>
  );
};

export default PredictionCard;
