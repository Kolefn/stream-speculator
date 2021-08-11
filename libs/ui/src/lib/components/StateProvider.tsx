import { ReactNode } from 'react';
import {
  ChannelStore,
  ChannelStoreContext,
  UserStore,
  UserStoreContext,
} from '@stream-speculator/state';

const StateProvider = (props: {
  children: ReactNode;
  userStore?: UserStore;
  channelStore?: ChannelStore;
}) => {
  return (
    <UserStoreContext.Provider value={props.userStore ?? new UserStore()}>
      <ChannelStoreContext.Provider
        value={props.channelStore ?? new ChannelStore()}
      >
        {props.children}
      </ChannelStoreContext.Provider>
    </UserStoreContext.Provider>
  );
};

export default StateProvider;
