import { Avatar, Flex, Heading, HStack } from '@chakra-ui/react';
import { useUserStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';
import { TwitchPurpleLight } from '../colors';
import CoinBalance from './CoinBalance';
import LoginButton from './LoginButton';

const AuthSection = observer(() => {
  const store = useUserStore();
  return store.isGuest ? (
    <LoginButton />
  ) : (
    <HStack spacing="8px">
      <Heading size="xs" fontWeight="normal">
        {store.displayName}
      </Heading>
      <Avatar
        src={store.profileImageUrl}
        size="sm"
        borderColor={TwitchPurpleLight}
        borderWidth="1px"
      />
    </HStack>
  );
});

const Header = observer(() => {
  return (
    <Flex
      bg="gray.700"
      direction="row"
      w="100%"
      p="8px"
      pl="20px"
      pr="20px"
      justify="space-between"
    >
      <CoinBalance />
      <AuthSection />
    </Flex>
  );
});
export default Header;
