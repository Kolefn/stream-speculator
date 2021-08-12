import { createContext, useContext } from 'react';
import { makeAutoObservable, runInAction } from 'mobx';
import { getFollowedStreams, login, loginAsGuest, logout } from '@stream-speculator/api';
import { DBToken, User, DBClient, FollowedStream } from '@stream-speculator/common';

// const MOCK_FOLLOWED_STREAMS: FollowedStream[] = [
//   {
//     displayName: 'ziqoftw',
//     profileImageUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/ziqoftw-profile_image-d4d7393232afa39e-70x70.png',
//     title: 'Goblinism | C9 Ziqo',
//     thumbnailUrl: 'https://static-cdn.jtvnw.net/previews-ttv/live_user_ziqoftw-440x248.jpg',
//   },
//   {
//     displayName: 'shroud',
//     profileImageUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/7ed5e0c6-0191-4eef-8328-4af6e4ea5318-profile_image-50x50.png',
//     title: '#VCT?? | Follow @shroud on socials',
//     thumbnailUrl: 'https://static-cdn.jtvnw.net/previews-ttv/live_user_shroud-440x248.jpg',
//   },
//   {
//     displayName: 'TimTheTatman',
//     profileImageUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/bd6ad02e-9bc7-4956-b62f-7277d9981109-profile_image-50x50.png',
//     title: 'hey! im tim!',
//     thumbnailUrl: 'https://static-cdn.jtvnw.net/previews-ttv/live_user_timthetatman-440x248.jpg',
//   },
//   {
//     displayName: 'Arlaeus',
//     profileImageUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/7ed23f4b-d369-47aa-9818-fdcc17cb9c3e-profile_image-50x50.png',
//     title: '[TBC] Mage Gold Farm 1000g/hr! <Method> !1000 !Oghest Challenge Day 6! || !Discord !restedxp !arlaeusmerch',
//     thumbnailUrl: 'https://static-cdn.jtvnw.net/previews-ttv/live_user_arlaeus-440x248.jpg',
//   }
// ];

export class UserStore {
  coins = 0;
  wins = 0;

  didAcceptCookies = false;

  id: string | null = null;

  dbToken: DBToken | null = null;

  displayName?: string;

  profileImageUrl?: string;

  loginError: Error | null = null;

  isGuest = true;

  followedStreams: FollowedStream[] = [];

  loadingAuth = false;

  get loggedIn() {
    return this.id !== null;
  }

  get dbClient() : DBClient | null {
    return this.dbToken ? new DBClient(this.dbToken.secret) : null;
  }

  constructor() {
    makeAutoObservable(this);
    this.didAcceptCookies = localStorage.getItem('stream-speculator-accepted-cookies') === 'true';
  }

  acceptCookies(){
    this.didAcceptCookies = true;
    localStorage.setItem('stream-speculator-accepted-cookies', 'true');
  }
  
  logout(){
    this.loadingAuth = true;
    logout().then(()=> {
      runInAction(()=> {
        this.displayName = undefined;
        this.profileImageUrl = undefined;
        this.isGuest = true;
        this.loadingAuth = false;
      });
    }).catch(()=> {
      runInAction(()=> {
        this.loadingAuth = false;
      });
    })
  }

  loginAsGuest() {
    this.loadingAuth = true;
    loginAsGuest().then((resp) => {
      runInAction(() => {
        this.id = resp.userId;
        this.dbToken = resp.dbToken;
        this.isGuest = true;
        this.profileImageUrl = '';
        this.displayName = '';
        this.loginError = null;
        this.loadingAuth = false;
      });
    }).catch((e) => {
      runInAction(() => {
        this.loginError = e;
        this.loadingAuth = false;
      });
    });
  }

  autoLogin() {
    this.loadingAuth = true;
    login().then((resp) => {
      runInAction(() => {
        this.id = resp.userId;
        this.dbToken = resp.dbToken;
        this.displayName = resp.displayName;
        this.profileImageUrl = resp.profileImageUrl;
        this.isGuest = resp.isGuest;
        this.loginError = null;
        this.loadingAuth = false;
      });
    }).catch((e) => {
      this.loginAsGuest();
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
        this.wins = user.wins ?? this.wins;
      });
    }, { includeSnapshot: true });
  }

  loadFollowedStreams(){
    if(this.isGuest || this.followedStreams.length > 0){
      return;
    }

    getFollowedStreams().then((streams)=> {
      runInAction(()=> {
        this.followedStreams = streams;
      });
    });
  }
}
export const UserStoreContext = createContext<UserStore>({} as UserStore);
export const useUserStore = () => useContext(UserStoreContext);
