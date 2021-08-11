export type Milliseconds = number;
export type UnixEpochTime = Milliseconds;
export type Seconds = number;

export type DBToken = {
  secret: string;
  expiresAt: Milliseconds;
};

export type LoginAsGuestResponse = {
  userId: string;
  dbToken: DBToken;
};

export type LoginResponse = {
  userId: string;
  dbToken: DBToken;
  isGuest: boolean;
  displayName?: string;
  profileImageUrl?: string;
};

export type TwitchStream = {
  id: string;
  startedAt: UnixEpochTime;
  viewerCount: number;
  title?: string;
};

export type TwitchChannel = {
  id: string;
  displayName: string;
  userName: string;
  isLive: boolean;
  profileImageUrl?: string;
  stream?: TwitchStream;
  predictionUpdate?: Partial<Prediction>;
};

export type TwitchChannelPageData = {
  channel: TwitchChannel,
  metrics?: {
    viewerCount?: StreamMetricPoint[];
  }
  predictions?: Prediction[],
  bets?: Bet[],
};

export enum StreamMetricType {
  ViewerCount = 1,
}

export type StreamMetric = {
  channelId: string;
  type: StreamMetricType;
  value: number;
  timestamp: Seconds;
};

export type StreamMetricPoint = {
  value: number;
  timestamp: Seconds;
};

export type User = {
  id: string;
  coins: number;
  wins?: number;
};

export type PredictionOutcome = {
  id: string;
  title: string;
  color: string;
  channelPointUsers: number;
  channelPoints: number;
  coinUsers: number;
  coins: number;
  personalBet?: number;
};

export enum AugmentationType {
  MoreLessEqual,
  IncreaseTarget,
}

export type AugmentationDetails = {
  type: AugmentationType,
  endsAt: UnixEpochTime;
  data?: any;
};

export type Prediction = {
  id: string;
  channelId: string;
  title: string;
  outcomes: { [id: string]: PredictionOutcome };
  winningOutcomeId?: string;
  status: 'active' | 'resolved' | 'canceled' | 'locked';
  startedAt: UnixEpochTime;
  locksAt: UnixEpochTime;
  endedAt?: UnixEpochTime;
  augmentation?: AugmentationDetails;
  personalNet?: number;
};

export type Bet = {
  id: string;
  userId: string;
  predictionId: string;
  outcomeId: string;
  channelId: string;
  coins: number;
};

export type BetRequest = Pick<Bet, 'predictionId' | 'outcomeId' | 'coins'>;


export type SearchResult = {
  displayName: string;
  profileImageUrl: string;
  isLive: boolean;
};