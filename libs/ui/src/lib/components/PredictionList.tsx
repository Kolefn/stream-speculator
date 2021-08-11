import { useBreakpointValue, Wrap, WrapItem } from '@chakra-ui/react';
import { useChannelStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';
import PredictionCard from './PredictionCard';

const PredictionList = observer(() => {
  const store = useChannelStore();
  const justify = useBreakpointValue({
    base: 'center',
    md: 'flex-start',
    lg: 'flex-start',
  });
  return (
    <Wrap justify={justify} spacing="10px">
      {store.predictions.map((p) => (
        <WrapItem key={p.id}>
          <PredictionCard
            id={p.id}
            onBet={(pid, oid, coins) => store.bet(pid, oid, coins)}
          />
        </WrapItem>
      ))}
    </Wrap>
  );
});

export default PredictionList;
