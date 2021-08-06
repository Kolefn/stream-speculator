import { Heading, Skeleton, Stack } from '@chakra-ui/react';
import { useChannelStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';

const ChannelTitle = observer(() => {
  const store = useChannelStore();
  return (
    <Stack spacing="5px">
      {store.channel ? (
        <Heading size="lg">{store.channel?.displayName}</Heading>
      ) : (
        <Skeleton h="20px" w="80px" />
      )}
      {store.channel ? (
        store.channel?.stream && (
          <Heading size="sm">{store.channel?.stream?.title}</Heading>
        )
      ) : (
        <Skeleton h="20px" w="200px" />
      )}
    </Stack>
  );
});

export default ChannelTitle;
