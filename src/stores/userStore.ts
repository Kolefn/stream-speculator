import { createContext, useContext } from 'react';
import { makeAutoObservable, runInAction } from 'mobx';
import { loginAsGuest } from '../api/endpoints';
import { DBToken, User } from '../common/types';
import DBClient from '../common/DBClient';

export class UserStore {
  coins: number = 0;

  id: string = '';

  dbToken: DBToken | null = null;

  loginError: Error | null = null;

  get loggedIn() {
    return this.id !== '';
  }

  constructor() {
    makeAutoObservable(this);
  }

  async login() {
    try {
      const response = await loginAsGuest();
      runInAction(() => {
        this.id = response.userId;
        this.dbToken = response.dbToken;
        this.loginError = null;
      });
    } catch (e) {
      runInAction(() => {
        this.loginError = e;
      });
    }
  }

  listenToCoins() {
    if (!this.dbToken) {
      return;
    }
    const client = new DBClient(this.dbToken?.secret);

    client.onChange(DBClient.users.doc(this.id), (data) => {
      const user = data.document.data as User;
      runInAction(() => {
        this.coins = user.coins;
      });
    }, { includeSnapshot: true });
  }
}
export const UserStoreContext = createContext<UserStore>({} as UserStore);
export const useUserStore = () => useContext(UserStoreContext);
