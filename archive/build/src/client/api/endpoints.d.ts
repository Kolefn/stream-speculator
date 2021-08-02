import { LoginAsGuestResponse, DBToken, TwitchChannelPageData, BetRequest, Bet, LoginResponse } from '../../common/types';
export declare const login: () => Promise<LoginResponse>;
export declare const loginAsGuest: () => Promise<LoginAsGuestResponse>;
export declare const getDBToken: () => Promise<DBToken>;
export declare const getTwitchChannelPageData: (channelName: string) => Promise<TwitchChannelPageData>;
export declare const postBet: (data: BetRequest) => Promise<Bet>;
//# sourceMappingURL=endpoints.d.ts.map