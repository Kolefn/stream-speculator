import {
  Button,
  ButtonGroup,
  CircularProgress,
  Flex,
  Heading,
  Stack,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { PredictionOutcome } from '@stream-speculator/common';
import { useChannelStore, useUserStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import CoinIcon from '../icons/CoinIcon';
import OutcomeButton from './OutcomeButton';
const MENUS = {
  OUTCOMES: 0,
  BET: 1,
  LOADING: 2,
};
const OutcomesMenu = observer(
  ({
    data,
    onBet,
    disabled,
  }: {
    data: PredictionOutcome[];
    onBet: (outcomeId: string, coins: number) => Promise<void>;
    disabled: boolean;
  }) => {
    const user = useUserStore();
    const channel = useChannelStore();
    const [menu, setMenu] = useState(MENUS.OUTCOMES);
    useEffect(() => {
      if (disabled) {
        setMenu(MENUS.OUTCOMES);
      }
    }, [disabled]);
    const onSelectOutcome = useCallback(
      (id: string) => {
        channel.setSelectedOutcomeId(id);
        if (user.coins === 0) {
          setMenu(MENUS.LOADING);
          onBet(id, 0).finally(() => {
            setMenu(MENUS.OUTCOMES);
            channel.setSelectedOutcomeId(undefined);
          });
        } else {
          setMenu(MENUS.BET);
        }
      },
      [user.coins, onBet]
    );
    const outcomes = useMemo(
      () =>
        data.map((o) => (
          <OutcomeButton
            key={o.id}
            data={o}
            onSelect={onSelectOutcome}
            disabled={disabled}
          />
        )),
      [data, onSelectOutcome, disabled]
    );

    const BetButton = useCallback(
      ({ value }: { value: number }) => {
        const rounded = Math.floor(value);
        return (
          <Button
            disabled={disabled}
            leftIcon={<CoinIcon color="whiteAlpha.800" />}
            size="xs"
            variant="outline"
            onClick={() => {
              setMenu(MENUS.LOADING);
              if (channel.selectedOutcomeId) {
                onBet(channel.selectedOutcomeId, rounded).finally(() => {
                  setMenu(MENUS.OUTCOMES);
                  channel.setSelectedOutcomeId(undefined);
                });
              }
            }}
          >
            {rounded}
          </Button>
        );
      },
      [onBet, channel.selectedOutcomeId, disabled]
    );

    const betOptions = useMemo(() => {
      return (
        <Wrap spacing="5px">
          {user.coins / 10 >= 100 && (
            <WrapItem>
              <BetButton value={user.coins / 10} />
            </WrapItem>
          )}
          {user.coins / 4 >= 100 && (
            <WrapItem>
              <BetButton value={user.coins / 4} />
            </WrapItem>
          )}
          {user.coins / 2 >= 100 && (
            <WrapItem>
              <BetButton value={user.coins / 2} />
            </WrapItem>
          )}
          <WrapItem>
            <BetButton value={user.coins} />
          </WrapItem>
          <WrapItem>
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setMenu(MENUS.OUTCOMES);
                channel.setSelectedOutcomeId(undefined);
              }}
            >
              Cancel
            </Button>
          </WrapItem>
        </Wrap>
      );
    }, [user.coins, BetButton]);
    switch (menu) {
      case MENUS.OUTCOMES:
        return <Stack spacing="8px">{outcomes}</Stack>;
      case MENUS.LOADING:
        return (
          <Flex alignItems="center" w="100%" justifyContent="center">
            <CircularProgress isIndeterminate size="25px" />
          </Flex>
        );
      case MENUS.BET:
        return (
          <Stack spacing="5px">
            <Heading fontSize="xs" color="whiteAlpha.700" fontWeight="normal">
              Place Bet
            </Heading>
            {betOptions}
          </Stack>
        );
    }
    return null;
  }
);

export default OutcomesMenu;
