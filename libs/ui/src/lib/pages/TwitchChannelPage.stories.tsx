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

export const PostLoad = () => {
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
      startedAt: Date.now() - 60 * 59 * 1000,
      viewerCount: 3731,
      title: 'Ranking Apex Legends | Follow on socials',
    },
  };

  channelStore.predictions = [
    {
      id: '12345',
      channelId: '43212',
      title: 'Viewer count in %',
      status: 'active',
      startedAt: Date.now() - 60 * 1000,
      locksAt: Date.now() + 60 * 4000,
      outcomes: {
        '0': {
          id: '0',
          title: 'More than 1,700',
          color: '#fff',
          channelPointUsers: 1,
          channelPoints: 1000,
          coinUsers: 1,
          coins: 500,
        },
        '1': {
          id: '1',
          title: 'Less than 1,700',
          color: '#fff',
          channelPointUsers: 2,
          channelPoints: 3000,
          coinUsers: 2,
          coins: 1200,
        },
        '2': {
          id: '2',
          title: 'Exactly 1,700',
          color: '#fff',
          channelPointUsers: 0,
          channelPoints: 0,
          coinUsers: 0,
          coins: 0,
        },
      },
    },
  ];

  return (
    <StateProvider userStore={userStore} channelStore={channelStore}>
      <TwitchChannelPage />
    </StateProvider>
  );
};
