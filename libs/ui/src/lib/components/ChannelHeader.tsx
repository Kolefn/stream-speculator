import { HStack, Stack } from '@chakra-ui/react';
import { useChannelStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';
import ChannelMetaBar from './ChannelMetaBar';
import ChannelProfile from './ChannelProfile';
import ChannelTitle from './ChannelTitle';

const ChannelHeader = observer(() => {
  const store = useChannelStore();
  return (
    <HStack direction="row" spacing="15px" w="100%" alignItems="flex-start">
      <ChannelProfile />
      <Stack spacing="5px" w="100%">
        <ChannelTitle />
        {store.channel?.isLive && <ChannelMetaBar />}
      </Stack>
    </HStack>
  );
});

export default ChannelHeader;
