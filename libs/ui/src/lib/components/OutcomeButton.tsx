import {
  Button,
  Heading,
  HStack,
  Stack,
  Stat,
  StatGroup,
  StatLabel,
  StatNumber,
  Text,
} from '@chakra-ui/react';
import { PredictionOutcome } from '@stream-speculator/common';
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
  return (
    <Button
      size="auto"
      variant="outline"
      borderColor="whiteAlpha.400"
      p="6px"
      onClick={() => onSelect(data.id)}
      disabled={disabled}
    >
      <Stack spacing="8px">
        <Heading size="xs">{data.title}</Heading>
        <HStack spacing="10px">
          <HStack spacing="5px">
            <UserIcon
              fontSize="15px"
              fontWeight="light"
              color="whiteAlpha.700"
              aria-label="Users"
            />
            <Text fontSize="s" fontWeight="light" color="whiteAlpha.800">
              {data.coinUsers + data.channelPointUsers}
            </Text>
          </HStack>
          <HStack spacing="5px">
            <CoinIcon
              fontSize="15px"
              fontWeight="light"
              color="whiteAlpha.700"
              aria-label="Coins"
            />
            <Text fontSize="s" fontWeight="light" color="whiteAlpha.800">
              {data.coins + data.channelPoints}
            </Text>
          </HStack>
        </HStack>
      </Stack>
    </Button>
  );
};

export default OutcomeButton;
