import { Stat, StatGroup, StatLabel, StatNumber } from '@chakra-ui/react';
import { useChannelStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';

const ChannelMetaBar = observer(() => {
  const store = useChannelStore();

  return (
    <StatGroup maxW="400px">
      <Stat>
        <StatLabel fontSize="xs" color="whiteAlpha.500">
          Uptime
        </StatLabel>
        <StatNumber fontSize="s">1h 33m 13s</StatNumber>
      </Stat>

      <Stat>
        <StatLabel fontSize="xs" color="whiteAlpha.500">
          Viewers
        </StatLabel>
        <StatNumber fontSize="s">{store.currentViewerCount}</StatNumber>
      </Stat>
    </StatGroup>
  );
});

export default ChannelMetaBar;
