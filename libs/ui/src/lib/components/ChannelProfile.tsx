import { Avatar, AvatarBadge, SkeletonCircle, Box } from '@chakra-ui/react';
import { useChannelStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';

const ChannelProfile = observer(() => {
  const store = useChannelStore();
  return (
    <Box>
      {store.channel ? (
        <Avatar>
          {store.channel?.isLive && (
            <AvatarBadge
              src={store.channel.profileImageUrl}
              boxSize="1.25em"
              bg="red"
            />
          )}
        </Avatar>
      ) : (
        <SkeletonCircle w="60px" h="60px" />
      )}
    </Box>
  );
});

export default ChannelProfile;
