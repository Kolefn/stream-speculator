import { Flex } from '@chakra-ui/react';
import ChannelHeader from '../components/ChannelHeader';
import Header from '../components/Header';
import PredictionList from '../components/PredictionList';
const TwitchChannelPage = () => {
  return (
    <Flex w="100%" h="100%" direction="column">
      <Header />
      <Flex direction="column" p="20px">
        <ChannelHeader />
        <PredictionList />
      </Flex>
    </Flex>
  );
};
export default TwitchChannelPage;
