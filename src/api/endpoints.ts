import request from './request';
import { LoginAsGuestResponse, DBToken, TwitchChannelPageData } from '../common/types';

export const loginAsGuest = () => request<LoginAsGuestResponse>('POST', '/api/auth/loginAsGuest');
export const getDBToken = () => request<DBToken>('GET', '/api/auth/dbToken');
export const getTwitchChannelPageData = (channelName: string) => request<TwitchChannelPageData>('GET', `/api/twitch/${channelName}`);
