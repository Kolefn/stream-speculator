import { HStack } from '@chakra-ui/react';
import { useChannelStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';
import PredictionCard from './PredictionCard';

const PredictionList = observer(() => {
  const store = useChannelStore();

  return (
    <HStack>
      {store.predictions.map((p) => (
        <PredictionCard key={p.id} data={p} />
      ))}
    </HStack>
  );
});

export default PredictionList;
