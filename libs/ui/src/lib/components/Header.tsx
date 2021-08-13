import {
  Avatar,
  Heading,
  HStack,
  Box,
  useBreakpointValue,
  MenuButton,
  Menu,
  MenuList,
  MenuItem,
  SkeletonCircle,
  Flex,
  Badge,
} from '@chakra-ui/react';
import { useUserStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';
import { TwitchPurpleLight } from '../colors';
import LogoIcon from '../icons/LogoIcon';
import CoinBalance from './CoinBalance';
import LoginButton from './LoginButton';
import Search from './Search';

const AvatarMenu = ({
  imageUrl,
  onLogout,
}: {
  imageUrl?: string;
  onLogout: () => void;
}) => {
  return (
    <Menu>
      <MenuButton
        as={Avatar}
        src={imageUrl}
        size="sm"
        borderColor={TwitchPurpleLight}
        borderWidth="1px"
        cursor="pointer"
      />
      <MenuList>
        <MenuItem onClick={onLogout}>Logout</MenuItem>
      </MenuList>
    </Menu>
  );
};

const AuthSection = observer(() => {
  const store = useUserStore();
  const showName = useBreakpointValue({ base: false, md: true });
  if (store.loadingAuth) {
    return <SkeletonCircle color="whiteAlpha.500" />;
  }
  return store.isGuest ? (
    <LoginButton />
  ) : (
    <HStack spacing="8px">
      {showName && (
        <Heading size="xs" fontWeight="normal" color="whiteAlpha.900">
          {store.displayName}
        </Heading>
      )}
      <AvatarMenu
        imageUrl={store.profileImageUrl}
        onLogout={() => store.logout()}
      />
    </HStack>
  );
});

const Header = ({ showSearch }: { showSearch?: boolean }) => {
  const collapseSearch = useBreakpointValue({ base: true, sm: false });
  const showSiteTitle =
    useBreakpointValue({ base: false, md: true }) && !showSearch;
  return (
    <HStack
      bg="gray.700"
      w="100%"
      h="58px"
      p="8px"
      pl="20px"
      pr="20px"
      justify={showSiteTitle ? 'center' : 'space-between'}
      spacing="25px"
    >
      <Flex w="100%" justify="flex-start" direction="row">
        <CoinBalance />
      </Flex>
      {showSearch && !collapseSearch && (
        <Box w="100%" maxW="500px">
          <Search />
        </Box>
      )}
      {showSiteTitle && (
        <HStack justify="center" align="center" spacing="10px" w="100%">
          <LogoIcon fontSize="lg" />
          <Heading fontWeight="thin" textTransform="uppercase" size="md">
            Stream Speculator
          </Heading>
          <Badge colorScheme="green">Beta</Badge>
        </HStack>
      )}
      <HStack spacing="10px" justify="flex-end" w="100%">
        {showSearch && collapseSearch && <Search collapsed={collapseSearch} />}
        <AuthSection />
      </HStack>
    </HStack>
  );
};
export default Header;
