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
};

export type TwitchChannel = {
  id: string;
  displayName: string;
  userName: string;
  isLive: boolean;
  stream?: TwitchStream;
  predictionUpdate?: Partial<Prediction>;
};

export type TwitchChannelPageData = {
  channel: TwitchChannel,
  metrics?: {
    viewerCount?: StreamMetricPoint[];
  }
  predictions?: Prediction[],
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
};

export type PredictionOutcome = {
  id: string;
  title: string;
  color: string;
  channelPointUsers: number;
  channelPoints: number;
  coinUsers: number;
  coins: number;
};

export enum AugmentationType {
  MoreLessEqual,
  IncreaseTarget,
}

export type AugmentationDetails = {
  type: AugmentationType,
  data?: any;
};

export type Prediction = {
  id: string;
  channelId: string;
  title: string;
  outcomes: { [id: string]: PredictionOutcome };
  winningOutcomeId?: string;
  status?: 'resolved' | 'canceled';
  startedAt: UnixEpochTime;
  locksAt: UnixEpochTime;
  endedAt?: UnixEpochTime;
  augmentation?: AugmentationDetails;
};

export type Bet = {
  id: string;
  userId: string;
  predictionId: string;
  outcomeId: string;
  coins: number;
};

export type BetRequest = Pick<Bet, 'predictionId' | 'outcomeId' | 'coins'>;
