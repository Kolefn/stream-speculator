import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from 'react-router-dom';
import HomePage from './pages/HomePage';
import TwitchChannelPage from './pages/TwitchChannelPage';
import { ChannelStore, ChannelStoreContext } from './stores/channelStore';
import { UserStoreContext, UserStore, useUserStore } from './stores/userStore';

const OnAppLoad = observer(() => {
  const userStore = useUserStore();
  useEffect(() => {
    userStore.autoLogin();
  }, []);

  useEffect(() => {
    if (userStore.loggedIn) {
      const unsub = userStore.listenToCoins();
      return () => (unsub ? unsub() : null);
    }
    return undefined;
  }, [userStore.loggedIn]);
  return null;
});

const App = () => (
  <Router>
    <OnAppLoad />
    <Switch>
      <Route path="/twitch/:channelName"><TwitchChannelPage /></Route>
      <Route path="/"><HomePage /></Route>
    </Switch>
  </Router>
);

const AppWithContext = () => (
  <UserStoreContext.Provider value={new UserStore()}>
    <ChannelStoreContext.Provider value={new ChannelStore()}>
      <App />
    </ChannelStoreContext.Provider>
  </UserStoreContext.Provider>
);

ReactDOM.render(<AppWithContext />, document.getElementById('root'));
