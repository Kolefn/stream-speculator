import { createContext, useContext } from 'react';
import { makeAutoObservable, runInAction } from 'mobx';
import { login, loginAsGuest } from '@stream-speculator/api';
import { DBToken, User, DBClient } from '@stream-speculator/common';

export class UserStore {
  coins = 0;

  id: string | null = null;

  dbToken: DBToken | null = null;

  displayName?: string;

  profileImageUrl?: string;

  loginError: Error | null = null;

  isGuest = true;

  get loggedIn() {
    return this.id !== null;
  }

  get dbClient() : DBClient | null {
    return this.dbToken ? new DBClient(this.dbToken.secret) : null;
  }

  constructor() {
    makeAutoObservable(this);
  }

  async loginAsGuest() {
    loginAsGuest().then((resp) => {
      runInAction(() => {
        this.id = resp.userId;
        this.dbToken = resp.dbToken;
        this.isGuest = true;
        this.profileImageUrl = '';
        this.displayName = '';
        this.loginError = null;
      });
    }).catch((e) => {
      runInAction(() => {
        this.loginError = e;
      });
    });
  }

  async autoLogin() {
    login().then((resp) => {
      runInAction(() => {
        this.id = resp.userId;
        this.dbToken = resp.dbToken;
        this.displayName = resp.displayName;
        this.profileImageUrl = resp.profileImageUrl;
        this.isGuest = resp.isGuest;
        this.loginError = null;
      });
    }).catch((e) => {
      runInAction(() => {
        this.loginError = e;
      });
    });
  }

  listenToCoins() : (() => void) | undefined {
    if (!this.dbClient || !this.dbToken || !this.id) {
      return undefined;
    }

    return this.dbClient.onChange(DBClient.users.doc(this.id), (data) => {
      const user = data.document.data as User;
      runInAction(() => {
        this.coins = user.coins;
      });
    }, { includeSnapshot: true });
  }
}
export const UserStoreContext = createContext<UserStore>({} as UserStore);
export const useUserStore = () => useContext(UserStoreContext);
