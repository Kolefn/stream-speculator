import {
  Stack,
  Box,
  Heading,
  Divider,
  Badge,
  StatGroup,
  Stat,
  StatLabel,
  StatNumber,
} from '@chakra-ui/react';
import {
  getPayoutPerCoin,
  Prediction,
  UnixEpochTime,
} from '@stream-speculator/common';
import { useChannelStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import OutcomesMenu from './OutcomesMenu';
import PredictionProgress from './PredictionProgress';

const zeroPad = (n: number): string => {
  if (n < 10 && n >= 0) {
    return `0${n}`;
  }

  return n.toString();
};

const getColorOfStatus = (config: Pick<Prediction, 'status'>): string => {
  switch (config.status) {
    case 'active':
      return 'green';
    case 'canceled':
      return 'gray';
    case 'locked':
      return 'red';
    case 'resolved':
      return 'blue';
  }
};

const TitleAtTime = ({ title, end }: { title: string; end: UnixEpochTime }) => {
  const date = new Date(end);
  return (
    <>
      {title.replace(
        '%',
        `at ${zeroPad(date.getHours())}:${zeroPad(date.getMinutes())}`
      )}
    </>
  );
};
const PredictionCardTitle = observer(({ data }: { data: Prediction }) => {
  const store = useChannelStore();
  return (
    <Stack spacing="2px">
      <Heading fontSize="xs" color="whiteAlpha.600" fontWeight="normal">
        {store.selectedOutcomeId ? 'Your Prediction' : 'Predict'}
      </Heading>
      <Heading size="md" color="whiteAlpha.900">
        {store.selectedOutcomeId ? (
          data.outcomes[store.selectedOutcomeId].title
        ) : (
          <TitleAtTime
            title={data.title}
            end={data.augmentation ? data.augmentation.endsAt : data.locksAt}
          />
        )}
      </Heading>
    </Stack>
  );
});

const ResolvedInfo = ({ data }: { data: Prediction }) => {
  const payoutPerCoin = getPayoutPerCoin(
    data.winningOutcomeId as string,
    data.outcomes
  );
  return (
    <Stack spacing="5px">
      <Heading fontSize="s" color="whiteAlpha.800" fontWeight="normal">
        {data.outcomes[data.winningOutcomeId as string].title}
      </Heading>
      <StatGroup>
        <Stat>
          <StatLabel fontSize="xs" color="whiteAlpha.500">
            Payout
          </StatLabel>
          <StatNumber fontSize="xs">{`1:${payoutPerCoin}`}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel fontSize="xs" color="whiteAlpha.500">
            Your Net
          </StatLabel>
          <StatNumber fontSize="xs">{data.personalNet ?? 0}</StatNumber>
        </Stat>
      </StatGroup>
    </Stack>
  );
};

const PredictionCard = ({
  data,
  onBet,
}: {
  data: Prediction;
  onBet: (
    predictionId: string,
    outcomeId: string,
    coins: number
  ) => Promise<void>;
}) => {
  const active = data.status === 'active';
  const locked = data.status === 'locked';
  const resolved = data.status === 'resolved';
  return (
    <Box borderRadius="md" bg="whiteAlpha.100" overflow="hidden" minW="225px">
      <Box position="relative" h="0">
        <Badge
          position="absolute"
          top="10px"
          right="10px"
          variant="subtle"
          fontSize="10px"
          colorScheme={getColorOfStatus(data)}
        >
          {data.status}
        </Badge>
      </Box>
      <Stack spacing="10px" direction="column" p="25px" pt="20px">
        <PredictionCardTitle data={data} />
        <Divider />
        {(active || locked) && (
          <OutcomesMenu
            data={Object.values(data.outcomes)}
            onBet={(outcomeId, coins) => onBet(data.id, outcomeId, coins)}
            disabled={locked}
          />
        )}
        {resolved && <ResolvedInfo data={data} />}
      </Stack>
      {active && (
        <PredictionProgress start={data.startedAt} end={data.locksAt} />
      )}
    </Box>
  );
};

export default PredictionCard;
