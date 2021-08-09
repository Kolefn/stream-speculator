import { Avatar, Flex } from '@chakra-ui/react';
import { useUserStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';
import CoinBalance from './CoinBalance';
import LoginButton from './LoginButton';

const AuthSection = observer(() => {
  const store = useUserStore();
  return store.isGuest ? (
    <LoginButton />
  ) : (
    <Avatar src={store.profileImageUrl} name={store.displayName} size="sm" />
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
