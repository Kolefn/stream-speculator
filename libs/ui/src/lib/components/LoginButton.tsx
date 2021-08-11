import { Button, Link } from '@chakra-ui/react';
import { TwitchPurpleLight } from '../colors';
import TwitchIcon from '../icons/TwitchIcon';

const LoginButton = () => {
  return (
    <Button
      as={Link}
      leftIcon={<TwitchIcon color="whiteAlpha.800" />}
      color="whiteAlpha.800"
      borderColor={TwitchPurpleLight}
      variant="outline"
      aria-label="Login with Twitch"
      href={'/api/twitch/redirectTo'}
    >
      Login
    </Button>
  );
};

export default LoginButton;
