import { DBToken, LoginAsGuestResponse, LoginResponse } from '../../common/types';
import APIResponse from '../APIResponse';
import DB from '../../common/DBClient';
import TwitchClient from '../TwitchClient';
export declare type AuthSession = {
    userId: string;
    twitchId: string;
    isGuest: boolean;
    twitchToken?: string;
    state?: string;
    referrer?: string;
};
export declare const getDBToken: (session: AuthSession | null, db: DB) => Promise<DBToken>;
export declare const loginAsGuest: (session: AuthSession | null, db: DB) => Promise<APIResponse<LoginAsGuestResponse>>;
export declare const login: (session: AuthSession | null, db: DB, twitch: TwitchClient) => Promise<LoginResponse>;
export declare const redirectToTwitchLogin: (session: AuthSession | null, referrer?: string | undefined) => Promise<APIResponse<any>>;
export declare const redirectFromTwitchLogin: (session: Partial<AuthSession> | null, code: string, state: string, db: DB) => Promise<APIResponse<any>>;
//# sourceMappingURL=authHandlers.d.ts.map