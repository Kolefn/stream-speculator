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

export enum PredictionWindow {
  HalfMinute = 30,
  Minute = 60,
  FiveMinute = 300,
  TenMinute = 600,
  ThirtyMinute = 1800,
  Hour = 3600,
}

export enum PredictionPosition {
  Above = 1,
  Below = 2,
  Equal = 3,
}

export type PredictionBase = {
  channelId: string;
  metric: StreamMetricType;
  threshold: number;
  position: PredictionPosition;
  window: PredictionWindow;
  multiplier: number;
};

export type PredictionRequest = PredictionBase;

export type Prediction = PredictionBase & {
  id: string;
  userId: string;
  wager: number;
  maxReturn: number;
  maxReturnMetricVal: number;
  maxLossMetricVal: number;
  startMetricVal: number;
  createdAt: UnixEpochTime;
  endMetricVal?: number;
};

export type User = {
  id: string;
  coins: number;
};
