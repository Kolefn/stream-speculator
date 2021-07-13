import express, { Request, RequestHandler, Response } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { validationResult } from 'express-validator';
import APIResponse, { APIResponseStatus } from './APIResponse';
import TwitchClient from './TwitchClient';
import DBClient from '../common/DBClient';
import Scheduler from './Scheduler';
import { AuthSession, getDBToken, loginAsGuest } from './handlers/authHandlers';
import { getTwitchChannelPageData, handleTwitchWebhook } from './handlers/twitchHandlers';
import { handlePrediction, predictionRequestValidator } from './handlers/predictionHandlers';

declare global {
  namespace Express {
    interface Request {
      rawBody: any;
      session: AuthSession | null;
    }
  }
}

const dbClient = new DBClient(process.env.FAUNADB_SECRET as string);
const twitch = new TwitchClient(dbClient);
const scheduler = new Scheduler();

const buildHandler = <T>(responder: (req:Request, res:Response) => Promise<{} | APIResponse<T>>,
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
        APIResponse.send({ status: APIResponseStatus.ServerError }, res);
      }
    },
  ];

const ExpressApp = express();

ExpressApp.use((req, _res, next) => {
  req.rawBody = req.body;
  next();
});

ExpressApp.use(express.json());
ExpressApp.use(cookieParser(process.env.COOKIE_SIGNING_KEY as string));
ExpressApp.use((req, _res, next) => {
  try {
    req.session = JSON.parse(req.signedCookies.session);
  } catch {
    req.session = null;
  }
  next();
});

ExpressApp.get('/api/auth/dbToken', buildHandler((req) => getDBToken(req.session)));

ExpressApp.post('/api/auth/loginAsGuest', buildHandler((req) => loginAsGuest(req.session)));

ExpressApp.get('/api/twitch/:channelName', buildHandler((req) => getTwitchChannelPageData({
  db: dbClient,
  twitch,
  scheduler,
  channelName: req.params.channelName,
  session: req.session,
})));

ExpressApp.post('/api/twitch/webhook', buildHandler((req) => handleTwitchWebhook(req.headers, req.rawBody,
  { db: dbClient, scheduler })));

ExpressApp.post('/api/predict', buildHandler((req) => handlePrediction(req.session, req.body, { db: dbClient, scheduler }),
  predictionRequestValidator));

ExpressApp.use(express.static(process.env.PUBLIC_FOLDER_PATH as string));

ExpressApp.get('/twitch/:channelName', (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), `${process.env.PUBLIC_FOLDER_PATH}/index.html`));
});

export default ExpressApp;
