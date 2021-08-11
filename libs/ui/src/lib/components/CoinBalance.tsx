import {
  HStack,
  Stat,
  StatGroup,
  StatHelpText,
  StatLabel,
  StatNumber,
  useBreakpointValue,
} from '@chakra-ui/react';
import { WINS_PER_BONUS } from '@stream-speculator/common';
import { useUserStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';

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
        <StatNumber lineHeight="20px" fontWeight="normal" fontSize="s">
          {store.coins}
        </StatNumber>
      </Stat>
      <Stat>
        <StatLabel color="whiteAlpha.700" fontSize="xs">
          Wins
        </StatLabel>
        <StatNumber lineHeight="20px" fontWeight="normal" fontSize="s">
          {store.wins}
        </StatNumber>
      </Stat>
      <Stat>
        <StatLabel color="whiteAlpha.700" fontSize="xs">
          Progress
        </StatLabel>
        <StatNumber
          lineHeight="20px"
          fontWeight="normal"
          fontSize="s"
        >{`${percToBonus}%`}</StatNumber>
      </Stat>
    </HStack>
  );
});

export default CoinBalance;
