import { Button, Container, Heading, Stack } from '@chakra-ui/react';
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

const RouterWithCookiePermissionPrompt = observer(() => {
  const store = useUserStore();

  if (!store.didAcceptCookies) {
    return (
      <Stack
        h="100%"
        w="100%"
        justify="center"
        align="center"
        spacing="20px"
        p="25px"
      >
        <Container justifyContent="center" alignItems="center">
          <Heading size="lg" fontWeight="extrabold">
            <span role="img" aria-label="chocolate chip cookie emoji">
              🍪
            </span>{' '}
            Cookies
          </Heading>
          <Heading size="xs" fontWeight="normal" color="whiteAlpha.800">
            This site uses secure cookies for authenticating with Twitch, the
            server, and the database.
          </Heading>
        </Container>
        <Button
          variant="outline"
          color="whiteAlpha.900"
          onClick={() => store.acceptCookies()}
        >
          Accept All Cookies
        </Button>
      </Stack>
    );
  }
  return (
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
  );
});

const App = () => {
  return (
    <StateProvider>
      <UIProvider>
        <OnAppLoad />
        <RouterWithCookiePermissionPrompt />
      </UIProvider>
    </StateProvider>
  );
};

export default App;
