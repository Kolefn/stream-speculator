import { Button, Heading, HStack, Stack, Text } from '@chakra-ui/react';
import { PredictionOutcome } from '@stream-speculator/common';
import { TwitchPurpleLight } from '../colors';
import CoinIcon from '../icons/CoinIcon';
import UserIcon from '../icons/UserIcon';

const OutcomeButton = ({
  data,
  onSelect,
  disabled,
}: {
  data: PredictionOutcome;
  onSelect: (id: string) => void;
  disabled: boolean;
}) => {
  const didBetOn = data.personalBet && data.personalBet > 0;
  return (
    <Button
      size="auto"
      variant="outline"
      borderColor={didBetOn ? TwitchPurpleLight : 'whiteAlpha.400'}
      p="6px"
      onClick={() => onSelect(data.id)}
      disabled={disabled}
    >
      <Stack spacing="8px">
        <Heading size="s" fontWeight="medium">
          {data.title}
        </Heading>
        <HStack spacing="10px" justify="center">
          {(data.coinUsers > 0 || data.channelPointUsers > 0) && (
            <HStack spacing="5px">
              <UserIcon
                fontSize="13px"
                fontWeight="light"
                color="whiteAlpha.600"
                aria-label="Users"
              />
              <Text fontSize="s" fontWeight="light" color="whiteAlpha.800">
                {data.coinUsers + data.channelPointUsers}
              </Text>
            </HStack>
          )}
          <HStack spacing="5px">
            <CoinIcon
              fontSize="13px"
              fontWeight="light"
              color="whiteAlpha.600"
              aria-label="Coins"
            />
            <Text fontSize="s" fontWeight="light" color="whiteAlpha.800">
              {data.coins + data.channelPoints}
              {didBetOn ? ` (${data.personalBet})` : ''}
            </Text>
          </HStack>
        </HStack>
      </Stack>
    </Button>
  );
};

export default OutcomeButton;
