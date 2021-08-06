import { Homepage, TwitchChannelPage, UIProvider } from '@stream-speculator/ui';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
export function App() {
  return (
    <UIProvider>
      <BrowserRouter>
        <Switch>
          <Route path="/twitch/:channelName">
            <TwitchChannelPage />
          </Route>
          <Route path="/">
            <Homepage />
          </Route>
        </Switch>
      </BrowserRouter>
    </UIProvider>
  );
}

export default App;
