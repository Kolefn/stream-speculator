import { Stat, StatLabel, StatNumber } from '@chakra-ui/react';
import { useUserStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';

const CoinBalance = observer(() => {
  const store = useUserStore();
  return (
    <Stat>
      <StatLabel>Coins</StatLabel>
      <StatNumber lineHeight="25px">{store.coins}</StatNumber>
    </Stat>
  );
});

export default CoinBalance;
