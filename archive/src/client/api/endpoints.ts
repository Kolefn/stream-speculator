import request from './request';
import {
  LoginAsGuestResponse, DBToken, TwitchChannelPageData, BetRequest, Bet, LoginResponse,
} from '../../common/types';

export const login = () => request<LoginResponse>('POST', '/api/auth/login');
export const loginAsGuest = () => request<LoginAsGuestResponse>('POST', '/api/auth/loginAsGuest');
export const getDBToken = () => request<DBToken>('GET', '/api/auth/dbToken');
export const getTwitchChannelPageData = (channelName: string) => request<TwitchChannelPageData>('GET', `/api/twitch/${channelName}`);
export const postBet = (data: BetRequest) => request<Bet>('POST', '/api/bet', data);
