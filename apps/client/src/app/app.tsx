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

const TwitchChannelPageWithListeners = observer(() => {
  const userStore = useUserStore();
  const channelStore = useChannelStore();
  useEffect(() => {
    if (userStore.dbClient) {
      const subs = [
        channelStore.listenToMetrics(userStore.dbClient),
        channelStore.listenToPredictions(userStore.dbClient),
      ];
      return () => {
        subs.forEach((s) => s());
      };
    }
    return;
  }, [userStore.dbClient]);
  return <TwitchChannelPage />;
});

export function App() {
  return (
    <StateProvider>
      <UIProvider>
        <OnAppLoad />
        <BrowserRouter>
          <Switch>
            <Route path="/twitch/:channelName">
              <TwitchChannelPageWithListeners />
            </Route>
            <Route path="/">
              <Homepage />
            </Route>
          </Switch>
        </BrowserRouter>
      </UIProvider>
    </StateProvider>
  );
}

export default App;
