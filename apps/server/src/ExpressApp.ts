import express, { Request, RequestHandler, Response } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { validationResult } from 'express-validator';
import APIResponse, { APIResponseStatus } from './APIResponse';
import TwitchClient from './TwitchClient';
import { DBClient } from '@stream-speculator/common';
import Scheduler from './Scheduler';
import {
  AuthSession, getDBToken, login, loginAsGuest, redirectFromTwitchLogin, redirectToTwitchLogin,
} from './handlers/authHandlers';
import { getTwitchChannelPageData, handleTwitchWebhook, searchChannels } from './handlers/twitchHandlers';
import { handleBet, betRequestValidator } from './handlers/predictionHandlers';
import taskRouter from './handlers/taskRouter';
import { COOKIE_SIGNING_KEY, FAUNADB_SECRET, IS_OFFLINE, PUBLIC_FOLDER_PATH } from './environment';
import NotFoundError from './errors/NotFoundError';

declare global {
  namespace Express {
    interface Request {
      rawBody: any;
      session: AuthSession | null;
    }
  }
}

const dbClient = new DBClient(FAUNADB_SECRET as string);
const twitch = new TwitchClient(dbClient);
const scheduler = new Scheduler();

if(IS_OFFLINE){
  Scheduler.localHandler = (task) => taskRouter([task]);
}

const buildHandler = <T>(responder: (req:Request, res:Response) => Promise<Record<string, any> | APIResponse<T>>,
  validators?: RequestHandler[])
  : RequestHandler[] => [
    ...(validators ?? []),
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          APIResponse.send({ status: 400, data: { errors: errors.array() } }, res);
          return;
        }
        const response = await responder(req, res);
        if (response instanceof APIResponse) {
          response.send(res);
        } else {
          APIResponse.send({ data: response }, res);
        }
      } catch (e) {
        console.error(e);
        APIResponse.send({ status: e instanceof NotFoundError ? APIResponseStatus.NotFound : APIResponseStatus.ServerError }, res);
      }
    },
  ];

const ExpressApp = express();

ExpressApp.use((req, _res, next) => {
  req.rawBody = req.body;
  next();
});

ExpressApp.use(express.json());
ExpressApp.use(cookieParser(COOKIE_SIGNING_KEY as string));
ExpressApp.use((req, _res, next) => {
  try {
    req.session = JSON.parse(req.signedCookies.session);
  } catch {
    req.session = null;
  }
  next();
});

ExpressApp.get('/api/auth/dbToken', buildHandler((req) => getDBToken(req.session, dbClient)));

ExpressApp.post('/api/auth/loginAsGuest', buildHandler((req) => loginAsGuest(req.session, dbClient)));

ExpressApp.post('/api/auth/login', buildHandler((req) => login(req.session, dbClient, twitch)));

ExpressApp.get('/api/twitch/redirectTo', buildHandler((req) => redirectToTwitchLogin(req.session, req.headers.referer)));
ExpressApp.get('/api/twitch/redirectFrom', buildHandler((req) => redirectFromTwitchLogin(req.session, req.query.code as string, req.query.state as string, dbClient)));

ExpressApp.get('/api/twitch/channel', buildHandler((req) => getTwitchChannelPageData({
  db: dbClient,
  twitch,
  scheduler,
  channelName: req.query.name as string,
  session: req.session,
})));

ExpressApp.get('/api/twitch/searchChannels', buildHandler((req)=> searchChannels(req.session, req.query.term as string, twitch)))

ExpressApp.post('/api/twitch/webhook', buildHandler((req) => handleTwitchWebhook(req.headers, req.rawBody,
  { db: dbClient, scheduler, twitch })));

ExpressApp.post('/api/bet', buildHandler((req) => handleBet(req.session, req.body, dbClient)), betRequestValidator);

ExpressApp.use(express.static(PUBLIC_FOLDER_PATH as string));

ExpressApp.get('/twitch/:channelName', (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), `${PUBLIC_FOLDER_PATH}/index.html`));
});

export default ExpressApp;
