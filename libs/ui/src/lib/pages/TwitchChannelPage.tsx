import { Flex } from '@chakra-ui/react';
import ChannelHeader from '../components/ChannelHeader';
import Header from '../components/Header';
const TwitchChannelPage = () => {
  return (
    <Flex w="100%" h="100%" direction="column">
      <Header />
      <Flex direction="column" p="20px">
        <ChannelHeader />
      </Flex>
    </Flex>
  );
};
export default TwitchChannelPage;
