import { Heading, Skeleton, Stack } from '@chakra-ui/react';
import { useChannelStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';

const ChannelTitle = observer(() => {
  const store = useChannelStore();
  const isLoaded = Boolean(store.channel);
  return (
    <Stack spacing="5px">
      <Skeleton
        h={isLoaded ? 'auto' : '20px'}
        w={isLoaded ? 'auto' : '100px'}
        isLoaded={isLoaded}
      >
        <Heading size="md">{store.channel?.displayName}</Heading>
      </Skeleton>
      <Skeleton
        h={isLoaded ? 'auto' : '20px'}
        w={isLoaded ? 'auto' : '250px'}
        isLoaded={isLoaded}
      >
        {store.channel?.stream ? (
          <Heading size="xs" color="whiteAlpha.900" fontWeight="normal">
            {store.channel?.stream?.title}
          </Heading>
        ) : (
          <Heading
            size="xs"
            color="whiteAlpha.700"
            fontWeight="normal"
            textTransform="uppercase"
          >
            currently offline
          </Heading>
        )}
      </Skeleton>
    </Stack>
  );
});

export default ChannelTitle;
