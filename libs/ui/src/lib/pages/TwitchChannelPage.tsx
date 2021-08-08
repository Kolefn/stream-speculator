import { Divider, Stack } from '@chakra-ui/react';
import ChannelHeader from '../components/ChannelHeader';
import Header from '../components/Header';
import PredictionList from '../components/PredictionList';
const TwitchChannelPage = () => {
  return (
    <Stack>
      <Header />
      <Stack spacing="20px" p="30px">
        <ChannelHeader />
        <Divider />
        <PredictionList />
      </Stack>
    </Stack>
  );
};
export default TwitchChannelPage;
