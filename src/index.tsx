import React from 'react';
import ReactDOM from 'react-dom';
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from 'react-router-dom';
import HomePage from './pages/HomePage';
import TwitchChannelPage from './pages/TwitchChannelPage';

const App = () => (
  <Router>
    <Switch>
      <Route path="/twitch/:channelName"><TwitchChannelPage /></Route>
      <Route path="/"><HomePage /></Route>
    </Switch>
  </Router>
);

ReactDOM.render(<App />, document.getElementById('root'));
