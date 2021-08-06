import {
  Homepage,
  TwitchChannelPage,
  UIProvider,
  StateProvider,
} from '@stream-speculator/ui';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
export function App() {
  return (
    <StateProvider>
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
    </StateProvider>
  );
}

export default App;
