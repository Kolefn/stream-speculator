import {
  Avatar,
  Container,
  Heading,
  HStack,
  Image,
  Stack,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { FollowedStream } from '@stream-speculator/common';
import { useUserStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import { TwitchPurpleLight } from '../colors';

const FollowedStreamItem = ({ data }: { data: FollowedStream }) => {
  return (
    <Stack
      as={Link}
      to={`/twitch/${data.displayName}`}
      borderRadius="md"
      bg="whiteAlpha.100"
      overflow="hidden"
      maxW="250px"
      spacing="0px"
      _hover={{
        borderBottomWidth: '2px',
        borderBottomColor: 'whiteAlpha.700',
        transitionProperty: 'borderBottomWidth',
        transitionDuration: 0.5,
      }}
    >
      <Image src={data.thumbnailUrl} w="100%" />
      <HStack spacing="10px" p="10px">
        <Avatar
          src={data.profileImageUrl}
          size="sm"
          borderColor={TwitchPurpleLight}
          borderWidth="1px"
        />
        <Stack spacing="5px">
          <Heading fontSize="s">{data.displayName}</Heading>
          <Heading
            fontSize="xs"
            color="whiteAlpha.800"
            isTruncated
            maxW="180px"
            fontWeight="normal"
          >
            {data.title}
          </Heading>
        </Stack>
      </HStack>
    </Stack>
  );
};

const FollowedStreams = observer(() => {
  const store = useUserStore();
  return (
    <Wrap spacing="15px" justify="center">
      {store.followedStreams.map((s) => (
        <WrapItem>
          <FollowedStreamItem data={s} />
        </WrapItem>
      ))}
    </Wrap>
  );
});

export default FollowedStreams;
