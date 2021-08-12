import { Divider, Flex, Heading, Stack } from '@chakra-ui/react';
import { useChannelStore } from '@stream-speculator/state';
import { RequestError } from '@stream-speculator/api';
import { observer } from 'mobx-react-lite';
import ChannelHeader from '../components/ChannelHeader';
import Header from '../components/Header';
import PredictionList from '../components/PredictionList';
import { useEffect } from 'react';
const TwitchChannelPage = observer(() => {
  const store = useChannelStore();
  const notFound =
    store.loadError instanceof RequestError && store.loadError.status === 404;
  return (
    <Stack>
      <Header showSearch />
      {notFound ? (
        <Flex justify="center" w="100%" p="30px">
          <Heading size="md">Channel Not Found</Heading>
        </Flex>
      ) : (
        <Stack spacing="20px" p="30px">
          <ChannelHeader />
          <Divider />
          <PredictionList />
        </Stack>
      )}
    </Stack>
  );
});
export default TwitchChannelPage;
