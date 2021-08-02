/// <reference types="react" />
import { DBToken } from '../../common/types';
import DBClient from '../../common/DBClient';
export declare class UserStore {
    coins: number;
    id: string | null;
    dbToken: DBToken | null;
    displayName?: string;
    profileImageUrl?: string;
    loginError: Error | null;
    isGuest: boolean;
    get loggedIn(): boolean;
    get dbClient(): DBClient | null;
    constructor();
    loginAsGuest(): Promise<void>;
    autoLogin(): Promise<void>;
    listenToCoins(): Function | undefined;
}
export declare const UserStoreContext: import("react").Context<UserStore>;
export declare const useUserStore: () => UserStore;
//# sourceMappingURL=userStore.d.ts.map