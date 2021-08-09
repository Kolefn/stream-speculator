import {
  Bet,
  Prediction,
  PredictionOutcome,
  StreamMetricPoint,
} from './types';

type Points = StreamMetricPoint[];

export const OUTCOME_COINS_MIN = 100;
export const CHANNEL_POINTS_TO_COINS_RATIO = 1;
export const MAXIMUM_BET = 50000;

export const WINS_PER_BONUS = 50;
export const WIN_BONUS_COINS = 1000;

export const channelPointsToCoins = (val: number)
: number => Math.floor(val * CHANNEL_POINTS_TO_COINS_RATIO);

export const isValidBetAmount = (val: number) : boolean => val > 0 && val <= MAXIMUM_BET;

export const fillPointGaps = (points: Points)
: Points => {
  const filled: Points = [];
  points.forEach((p, i) => {
    if (i > 0 && typeof p.value === undefined) {
      filled.push({ ...p, value: filled[i - 1].value });
    } else {
      filled.push(p);
    }
  });

  return filled;
};

export const getPayoutPerCoin = (outcomeId: string, outcomes: { [key: string]: PredictionOutcome }) : number => {
  const selected = outcomes[outcomeId];
  const sTotal = channelPointsToCoins(selected.channelPoints) + selected.coins - OUTCOME_COINS_MIN;
  const otherTotal = Object.values(outcomes).filter((o)=> o.id !== outcomeId).reduce((n, o)=> channelPointsToCoins(o.channelPoints) + o.coins + n, 0);
  return 1 + (otherTotal / sTotal);
};

export const getPersonalNet = (p: Prediction, bets: Bet[]) : number => {
  if(p.status !== 'resolved'){
    return 0;
  }
  return bets.filter((b)=> b.predictionId === p.id)
            .reduce((net, b)=> {
              if(b.outcomeId === p.winningOutcomeId){
                return net + (getPayoutPerCoin(b.outcomeId, p.outcomes) * b.coins) - b.coins;
              }else{
                return net - b.coins;
              }
            }, 0);
};