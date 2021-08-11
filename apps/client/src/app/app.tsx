import { useChannelStore, useUserStore } from '@stream-speculator/state';
import {
  Homepage,
  TwitchChannelPage,
  UIProvider,
  StateProvider,
} from '@stream-speculator/ui';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import usePagePathname from './usePagePathname';
import usePageTitle from './usePageTitle';

const OnAppLoad = observer(() => {
  const userStore = useUserStore();
  useEffect(() => {
    userStore.autoLogin();
  }, []);

  useEffect(() => {
    if (userStore.loggedIn) {
      const unsub = userStore.listenToCoins();
      return () => (unsub ? unsub() : undefined);
    }
    return;
  }, [userStore.loggedIn]);
  return null;
});

const OnChannelPageLoad = observer(() => {
  const userStore = useUserStore();
  const channelStore = useChannelStore();

  const channelName = usePagePathname();
  usePageTitle(`${channelName} - Twitch`);

  useEffect(() => {
    if (userStore.loggedIn && channelName) {
      channelStore.load(channelName);
    }
  }, [userStore.loggedIn, channelName]);

  useEffect(() => {
    if (userStore.dbClient && channelStore.channel) {
      const subs = [
        channelStore.listenToMetrics(userStore.dbClient),
        channelStore.listenToPredictions(userStore.dbClient),
      ];
      return () => {
        subs.forEach((s) => s());
      };
    }
    return;
  }, [userStore.dbClient, channelStore.channel]);

  return null;
});

const TwitchChannelPageWithData = () => {
  return (
    <>
      <OnChannelPageLoad />
      <TwitchChannelPage />
    </>
  );
};

const OnHomepageLoad = observer(() => {
  const userStore = useUserStore();
  useEffect(() => {
    if (userStore.loggedIn && !userStore.isGuest) {
      userStore.loadFollowedStreams();
    }
  }, [userStore.loggedIn, userStore.isGuest]);
  return null;
});

export function App() {
  return (
    <StateProvider>
      <UIProvider>
        <OnAppLoad />
        <BrowserRouter>
          <Switch>
            <Route path="/twitch/:channelName">
              <TwitchChannelPageWithData />
            </Route>
            <Route path="/">
              <OnHomepageLoad />
              <Homepage />
            </Route>
          </Switch>
        </BrowserRouter>
      </UIProvider>
    </StateProvider>
  );
}

export default App;
