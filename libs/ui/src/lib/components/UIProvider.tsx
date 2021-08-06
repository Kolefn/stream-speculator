import { ChakraProvider } from '@chakra-ui/react';
import { ReactNode } from 'react';
import {
  ChannelStore,
  ChannelStoreContext,
  UserStore,
  UserStoreContext,
} from '@stream-speculator/state';
import theme from '../Theme';
const UIProvider = (props: { children: ReactNode }) => {
  return (
    <UserStoreContext.Provider value={new UserStore()}>
      <ChannelStoreContext.Provider value={new ChannelStore()}>
        <ChakraProvider theme={theme}>{props.children}</ChakraProvider>
      </ChannelStoreContext.Provider>
    </UserStoreContext.Provider>
  );
};
export default UIProvider;
