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
