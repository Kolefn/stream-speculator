export declare type Milliseconds = number;
export declare type UnixEpochTime = Milliseconds;
export declare type Seconds = number;
export declare type DBToken = {
    secret: string;
    expiresAt: Milliseconds;
};
export declare type LoginAsGuestResponse = {
    userId: string;
    dbToken: DBToken;
};
export declare type LoginResponse = {
    userId: string;
    dbToken: DBToken;
    isGuest: boolean;
    displayName?: string;
    profileImageUrl?: string;
};
export declare type TwitchStream = {
    id: string;
    startedAt: UnixEpochTime;
    viewerCount: number;
};
export declare type TwitchChannel = {
    id: string;
    displayName: string;
    userName: string;
    isLive: boolean;
    stream?: TwitchStream;
    predictionUpdate?: Partial<Prediction>;
};
export declare type TwitchChannelPageData = {
    channel: TwitchChannel;
    metrics?: {
        viewerCount?: StreamMetricPoint[];
    };
    predictions?: Prediction[];
};
export declare enum StreamMetricType {
    ViewerCount = 1
}
export declare type StreamMetric = {
    channelId: string;
    type: StreamMetricType;
    value: number;
    timestamp: Seconds;
};
export declare type StreamMetricPoint = {
    value: number;
    timestamp: Seconds;
};
export declare type User = {
    id: string;
    coins: number;
};
export declare type PredictionOutcome = {
    id: string;
    title: string;
    color: string;
    channelPointUsers: number;
    channelPoints: number;
    coinUsers: number;
    coins: number;
};
export declare enum AugmentationType {
    MoreLessEqual = 0,
    IncreaseTarget = 1
}
export declare type AugmentationDetails = {
    type: AugmentationType;
    data?: any;
};
export declare type Prediction = {
    id: string;
    channelId: string;
    title: string;
    outcomes: {
        [id: string]: PredictionOutcome;
    };
    winningOutcomeId?: string;
    status: 'active' | 'resolved' | 'canceled';
    startedAt: UnixEpochTime;
    locksAt: UnixEpochTime;
    endedAt?: UnixEpochTime;
    augmentation?: AugmentationDetails;
};
export declare type Bet = {
    id: string;
    userId: string;
    predictionId: string;
    outcomeId: string;
    coins: number;
};
export declare type BetRequest = Pick<Bet, 'predictionId' | 'outcomeId' | 'coins'>;
//# sourceMappingURL=types.d.ts.map