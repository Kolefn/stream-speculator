import request from './request';
import {
  LoginAsGuestResponse, DBToken, TwitchChannelPageData, Prediction, PredictionBase,
} from '../common/types';

export const loginAsGuest = () => request<LoginAsGuestResponse>('POST', '/api/auth/loginAsGuest');
export const getDBToken = () => request<DBToken>('GET', '/api/auth/dbToken');
export const getTwitchChannelPageData = (channelName: string) => request<TwitchChannelPageData>('GET', `/api/twitch/${channelName}`);
export const predict = (data: PredictionBase) => request<Prediction>('POST', '/api/predict', data);
