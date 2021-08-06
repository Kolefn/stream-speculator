import { Meta } from '@storybook/react';

import TwitchChannelPage from './TwitchChannelPage';
import { ChannelStore, UserStore } from '@stream-speculator/state';
import { StateProvider } from '../components';

export default {
  component: TwitchChannelPage,
  title: 'Pages/TwitchChannelPage',
} as Meta;

export const PreLoad = () => (
  <StateProvider>
    <TwitchChannelPage />
  </StateProvider>
);

const userStore = new UserStore();
const channelStore = new ChannelStore();

userStore.coins = 9841;
userStore.displayName = 'Bob Ross';
userStore.isGuest = true;
userStore.id = '12345';
channelStore.viewerCount = [{ value: 3731, timestamp: Date.now() }];
channelStore.channel = {
  id: '54217321',
  displayName: 'TimTheTatman',
  userName: 'timethetatman',
  isLive: true,
  profileImageUrl:
    'https://static-cdn.jtvnw.net/jtv_user_pictures/bd6ad02e-9bc7-4956-b62f-7277d9981109-profile_image-70x70.png',
  stream: {
    id: '181231',
    startedAt: Date.now() - 60000,
    viewerCount: 3731,
    title: 'Ranking Apex Legends | Follow on socials',
  },
};

export const PostLoad = () => {
  return (
    <StateProvider userStore={userStore} channelStore={channelStore}>
      <TwitchChannelPage />
    </StateProvider>
  );
};
