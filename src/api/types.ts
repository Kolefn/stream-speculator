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

export type TwitchChannel = {
  id: string;
  login: string;
};

type TwitchStream = {
  id: string;
  channelId: string;
  startedAt: UnixEpochTime;
};

export type TwitchChannelPageData = {
    channel: TwitchChannel,
    stream?: TwitchStream,
}