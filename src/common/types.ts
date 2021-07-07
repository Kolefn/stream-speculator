export type Milliseconds = number;
export type UnixEpochTime = Milliseconds;

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
};

export enum StreamMetricType {
  ViewerCount = 1,
}

export type StreamMetric = {
  channelId: string;
  type: StreamMetricType;
  value: number;
  timestamp: number;
};

export type StreamMetricPoint = {
  value: number;
  timestamp: number;
};

export enum PredictionPeriod {
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
  period: PredictionPeriod;
  multiplier: number;
};

export type PredictionRequest = PredictionBase;

export type Prediction = PredictionBase & {
  id: string;
  wager: number;
  maxReturn: number;
  targetMetricValue: number;
  startMetricValue: number;
  expiresAt: UnixEpochTime;
  metricValueEnd?: number;
};
