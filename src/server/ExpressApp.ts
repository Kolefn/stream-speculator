import express, { Request, Response } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import APIResponse, { APIResponseStatus } from './APIResponse';
import { getDBToken, loginAsGuest } from './handlers/authHandlers';
import { getTwitchChannelPageData, handleTwitchWebhook } from './handlers/twitchHandlers';

const expressify = async <T>(responder: () => Promise<{} | APIResponse<T>>, res: Response) => {
  try {
    const response = await responder();
    if (response instanceof APIResponse) {
      response.send(res);
    } else {
      APIResponse.send({ data: response }, res);
    }
  } catch (e) {
    console.error(e);
    APIResponse.send({ status: APIResponseStatus.ServerError }, res);
  }
};

const ExpressApp = express();

ExpressApp.use(cookieParser(process.env.COOKIE_SIGNING_KEY as string));

const getSession = (req: Request) : any => {
  try {
    return JSON.parse(req.signedCookies.session);
  } catch (e) {
    return null;
  }
};

ExpressApp.get('/api/auth/dbToken', async (req, res) => {
  expressify(() => getDBToken(getSession(req)), res);
});

ExpressApp.post('/api/auth/loginAsGuest', async (req, res) => {
  expressify(() => loginAsGuest(getSession(req)), res);
});

ExpressApp.get('/api/twitch/:channelName', async (req, res) => {
  expressify(() => getTwitchChannelPageData(req.params.channelName), res);
});

ExpressApp.post('/api/twitch/webhook', (req, res) => {
  expressify(() => handleTwitchWebhook(req.headers, req.body), res);
});

ExpressApp.use(express.static(process.env.PUBLIC_FOLDER_PATH as string));

ExpressApp.get('/twitch/:channelName', (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), `${process.env.PUBLIC_FOLDER_PATH}/index.html`));
});

export default ExpressApp;
