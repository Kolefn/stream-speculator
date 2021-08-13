import {
  Button,
  Modal,
  ModalOverlay,
  ModalBody,
  ModalContent,
  useDisclosure,
  Input,
  InputGroup,
  InputLeftElement,
  List,
  ListItem,
  Stack,
  Divider,
  AvatarBadge,
  Avatar,
  HStack,
  Heading,
  CircularProgress,
} from '@chakra-ui/react';
import { SearchResult } from '@stream-speculator/common';
import { useChannelStore, useUserStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo } from 'react';
import { TwitchPurpleLight } from '../colors';
import SearchIcon from '../icons/SearchIcon';

const SearchResultItem = observer(
  ({ data, index }: { data: SearchResult; index: number }) => {
    const store = useChannelStore();
    const selected = index === store.searchSelectIndex;
    return useMemo(
      () => (
        <ListItem
          bg={selected ? 'whiteAlpha.300' : 'whiteAlpha.100'}
          borderColor={selected ? 'whiteAlpha.400' : 'whiteAlpha.100'}
          borderWidth={'2px'}
          borderRadius="md"
          role={'option'}
          cursor={'pointer'}
          onClick={() => store.searchGoTo(data.displayName)}
          onMouseEnter={() => store.searchSelect(index)}
          aria-selected={selected ? 'true' : 'false'}
          padding="10px"
        >
          <HStack spacing="15px">
            <Avatar
              src={data.profileImageUrl}
              size="sm"
              borderColor={TwitchPurpleLight}
              borderWidth="1px"
            >
              {data.isLive && <AvatarBadge boxSize="1em" bg="red" />}
            </Avatar>
            <Heading size="sm">{data.displayName}</Heading>
          </HStack>
        </ListItem>
      ),
      [selected, index]
    );
  }
);

const SearchResults = observer(() => {
  const store = useChannelStore();
  useEffect(() => {
    store.searchSelect(0);
  }, []);
  return store.searchLoading || store.searchResults.length > 0 ? (
    <Stack spacing="10px" align="center">
      <Divider />
      {store.searchLoading ? (
        <CircularProgress size="20px" color="whiteAlpha.800" isIndeterminate />
      ) : (
        <List spacing="5px" w="100%">
          {store.searchResults.map((r, i) => (
            <SearchResultItem key={r.displayName} data={r} index={i} />
          ))}
        </List>
      )}
    </Stack>
  ) : null;
});

const SearchBody = () => {
  const store = useChannelStore();
  const userStore = useUserStore();
  const onKeyPress = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        store.searchGoTo(
          store.searchResults.length === 0 ? e.target.value : undefined
        );
      }
    },
    [store.searchResults.length]
  );
  const onChangeEvent = useCallback(
    (e) => {
      if (!userStore.isGuest) {
        store.search(e.target.value);
      }
    },
    [userStore.isGuest]
  );
  const onKeyDown = useCallback((e) => {
    if (e.keyCode === 38) {
      store.searchSelect(store.searchSelectIndex - 1);
      e.preventDefault();
    } else if (e.keyCode === 40) {
      store.searchSelect(store.searchSelectIndex + 1);
      e.preventDefault();
    }
  }, []);
  return (
    <Stack spacing="10px">
      <InputGroup>
        <InputLeftElement
          pointerEvents="none"
          children={<SearchIcon color="whiteAlpha.900" />}
        />
        <Input
          placeholder="Search Channels"
          onChange={onChangeEvent}
          onKeyPress={onKeyPress}
          onKeyDown={onKeyDown}
        />
      </InputGroup>
      <SearchResults />
    </Stack>
  );
};

const Search = ({ collapsed }: { collapsed?: boolean }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <>
      <Button
        onClick={onOpen}
        leftIcon={collapsed ? undefined : <SearchIcon color="whiteAlpha.700" />}
        variant="solid"
        color="whiteAlpha.700"
        w={collapsed ? undefined : '100%'}
        justifyContent="flex-start"
      >
        {collapsed ? <SearchIcon color="whiteAlpha.700" /> : 'Search Channels'}
      </Button>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent padding="10px">
          <ModalBody>
            <SearchBody />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default Search;
