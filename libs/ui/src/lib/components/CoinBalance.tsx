import {
  HStack,
  Skeleton,
  Stat,
  StatLabel,
  StatNumber,
  useBreakpointValue,
} from '@chakra-ui/react';
import { WINS_PER_BONUS } from '@stream-speculator/common';
import { useUserStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';

const StatValue = ({ text, loading }: { text: string; loading: boolean }) => {
  return (
    <Skeleton
      minH="15px"
      minW="50px"
      isLoaded={!loading}
      color="whiteAlpha.500"
    >
      <StatNumber
        lineHeight="20px"
        fontWeight="normal"
        fontSize="s"
        color="whiteAlpha.900"
      >
        {text}
      </StatNumber>
    </Skeleton>
  );
};

const CoinBalance = observer(() => {
  const store = useUserStore();
  const percToBonus = (((store.wins % WINS_PER_BONUS) / 50) * 100).toFixed(0);
  const spacing = useBreakpointValue({ base: '10px', md: '20px' });
  return (
    <HStack spacing={spacing} align="flex-start">
      <Stat>
        <StatLabel color="whiteAlpha.700" fontSize="xs">
          Coins
        </StatLabel>
        <StatValue text={store.coins.toString()} loading={store.loadingAuth} />
      </Stat>
      <Stat>
        <StatLabel color="whiteAlpha.700" fontSize="xs">
          Wins
        </StatLabel>
        <StatValue text={store.wins.toString()} loading={store.loadingAuth} />
      </Stat>
      <Stat>
        <StatLabel color="whiteAlpha.700" fontSize="xs">
          Progress
        </StatLabel>
        <StatValue text={`${percToBonus}%`} loading={store.loadingAuth} />
      </Stat>
    </HStack>
  );
});

export default CoinBalance;
