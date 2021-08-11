import {
  Avatar,
  Heading,
  HStack,
  Box,
  useBreakpointValue,
  Spacer,
} from '@chakra-ui/react';
import { useUserStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';
import { TwitchPurpleLight } from '../colors';
import CoinBalance from './CoinBalance';
import LoginButton from './LoginButton';
import Search from './Search';

const AuthSection = observer(() => {
  const store = useUserStore();
  const showName = useBreakpointValue({ base: false, md: true });
  return store.isGuest ? (
    <LoginButton />
  ) : (
    <HStack spacing="8px">
      {showName && (
        <Heading size="xs" fontWeight="normal">
          {store.displayName}
        </Heading>
      )}
      <Avatar
        src={store.profileImageUrl}
        size="sm"
        borderColor={TwitchPurpleLight}
        borderWidth="1px"
      />
    </HStack>
  );
});

const Header = ({ showSearch }: { showSearch?: boolean }) => {
  const collapseSearch = useBreakpointValue({ base: true, sm: false });
  return (
    <HStack
      bg="gray.700"
      w="100%"
      p="8px"
      pl="20px"
      pr="20px"
      justify="space-between"
      spacing="25px"
    >
      <CoinBalance />
      {showSearch && !collapseSearch && (
        <Box w="100%" maxW="500px">
          <Search />
        </Box>
      )}
      <HStack spacing="10px" justify="flex-end">
        {showSearch && collapseSearch && <Search collapsed={collapseSearch} />}
        <AuthSection />
      </HStack>
    </HStack>
  );
};
export default Header;
