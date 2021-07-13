import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from 'react-router-dom';
import HomePage from './pages/HomePage';
import TwitchChannelPage from './pages/TwitchChannelPage';
import { UserStoreContext, UserStore, useUserStore } from './stores/userStore';

const App = () => {
  const userStore = useUserStore();
  useEffect(() => {
    userStore.login().then(() => {
      userStore.listenToCoins();
    });
  }, []);
  return (
    <Router>
      <Switch>
        <Route path="/twitch/:channelName"><TwitchChannelPage /></Route>
        <Route path="/"><HomePage /></Route>
      </Switch>
    </Router>
  );
};

const AppWithContext = () => (
  <UserStoreContext.Provider value={new UserStore()}>
    <App />
  </UserStoreContext.Provider>
);

ReactDOM.render(<AppWithContext />, document.getElementById('root'));
