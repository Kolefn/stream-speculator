import {
  StatGroup,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
} from '@chakra-ui/react';
import { useChannelStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';

const ChannelMetaBar = observer(() => {
  const store = useChannelStore();

  return (
    <StatGroup>
      <Stat>
        <StatLabel>Uptime</StatLabel>
        <StatNumber>1h 33m 13s</StatNumber>
      </Stat>

      <Stat>
        <StatLabel>Viewers</StatLabel>
        <StatNumber>{store.currentViewerCount}</StatNumber>
      </Stat>
    </StatGroup>
  );
});

export default ChannelMetaBar;
