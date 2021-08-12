import request from './request';
import {
  LoginAsGuestResponse, DBToken, TwitchChannelPageData, BetRequest, Bet, LoginResponse, SearchResult, FollowedStream,
} from '@stream-speculator/common';

export const logout = () => request<any>('POST', '/api/auth/logout');
export const login = () => request<LoginResponse>('POST', '/api/auth/login');
export const loginAsGuest = () => request<LoginAsGuestResponse>('POST', '/api/auth/loginAsGuest');
export const getDBToken = () => request<DBToken>('GET', '/api/auth/dbToken');
export const getTwitchChannelPageData = (channelName: string) => request<TwitchChannelPageData>('GET', `/api/twitch/channel?name=${channelName}`);
export const postBet = (data: BetRequest) => request<Bet>('POST', '/api/bet', data);
export const searchChannels = (term: string) => request<SearchResult[]>('GET', `/api/twitch/searchChannels?term=${term}`);
export const getFollowedStreams = () => request<FollowedStream[]>('GET', '/api/twitch/followedStreams');
