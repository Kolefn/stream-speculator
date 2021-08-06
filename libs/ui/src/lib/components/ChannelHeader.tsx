import { Flex, HStack, Stack } from '@chakra-ui/react';
import { useChannelStore } from '@stream-speculator/state';
import ChannelMetaBar from './ChannelMetaBar';
import ChannelProfile from './ChannelProfile';
import ChannelTitle from './ChannelTitle';

const ChannelHeader = () => {
  const store = useChannelStore();
  return (
    <HStack direction="row" spacing="10px" w="100%">
      <ChannelProfile />
      <Stack spacing="5px" w="100%">
        <ChannelTitle />
        {store.channel?.isLive && <ChannelMetaBar />}
      </Stack>
    </HStack>
  );
};

export default ChannelHeader;
