import { Button } from '@chakra-ui/react';
import { TwitchPurpleLight } from '../colors';
import TwitchIcon from '../icons/TwitchIcon';

const LoginButton = () => {
  return (
    <Button
      leftIcon={<TwitchIcon color="whiteAlpha.800" />}
      color="whiteAlpha.800"
      borderColor={TwitchPurpleLight}
      variant="outline"
      aria-label="Twitch Login"
    >
      Login
    </Button>
  );
};

export default LoginButton;
