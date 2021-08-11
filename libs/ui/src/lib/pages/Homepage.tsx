import { Container, Heading, Stack } from '@chakra-ui/react';
import FollowedStreams from '../components/FollowedStreams';
import Header from '../components/Header';
import Search from '../components/Search';
const Homepage = () => {
  return (
    <Stack w="100%" h="100%" spacing="40px">
      <Header />
      <Stack spacing="40px" align="center" w="100%" justify="center">
        <Container w="80%">
          <Heading size="lg" fontWeight="light">
            Modless Twitch Predictions. Cross-channel points.
          </Heading>
        </Container>

        <Container w="80%">
          <Search />
        </Container>
      </Stack>
      <FollowedStreams />
    </Stack>
  );
};
export default Homepage;
