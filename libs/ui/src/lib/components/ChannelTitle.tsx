import { Heading, Skeleton, Stack } from '@chakra-ui/react';
import { useChannelStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';

const ChannelTitle = observer(() => {
  const store = useChannelStore();
  return (
    <Stack spacing="5px">
      {store.channel ? (
        <Heading size="md">{store.channel?.displayName}</Heading>
      ) : (
        <Skeleton h="20px" w="100px" />
      )}
      {store.channel ? (
        store.channel?.stream ? (
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
        )
      ) : (
        <Skeleton h="20px" w="250px" />
      )}
    </Stack>
  );
});

export default ChannelTitle;
