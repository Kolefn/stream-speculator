import { Avatar, AvatarBadge, SkeletonCircle, Box } from '@chakra-ui/react';
import { useChannelStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';
import { TwitchPurpleLight } from '../colors';

const ChannelProfile = observer(() => {
  const store = useChannelStore();
  return (
    <Box>
      {store.channel ? (
        <Avatar
          src={store.channel.profileImageUrl}
          borderColor={TwitchPurpleLight}
          borderWidth="2px"
          w="60px"
          h="60px"
        >
          {store.channel?.isLive && <AvatarBadge boxSize="1em" bg="red" />}
        </Avatar>
      ) : (
        <SkeletonCircle w="60px" h="60px" />
      )}
    </Box>
  );
});

export default ChannelProfile;
