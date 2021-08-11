import { Meta } from '@storybook/react';

import TwitchChannelPage from './TwitchChannelPage';
import { ChannelStore, UserStore } from '@stream-speculator/state';
import { StateProvider } from '../components';
import Homepage from './Homepage';
import { BrowserRouter } from 'react-router-dom';

export default {
  component: Homepage,
  title: 'Pages/Homepage',
} as Meta;

export const Base = () => {
  const userStore = new UserStore();
  const channelStore = new ChannelStore();

  userStore.coins = 10000;
  userStore.wins = 3;
  userStore.displayName = 'Bob Ross';
  userStore.isGuest = true;
  userStore.id = '12345';

  return (
    <BrowserRouter>
      <StateProvider userStore={userStore} channelStore={channelStore}>
        <Homepage />
      </StateProvider>
    </BrowserRouter>
  );
};
