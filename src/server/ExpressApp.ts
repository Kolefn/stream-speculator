import express from 'express';
import path from 'path';
import DBClient from './DBClient';
import SchedulerClient from './SchedulerClient';
import TwitchClient from './TwitchClient';
import Cookie from "./Cookie";
import cookieParser from "cookie-parser";

const db = new DBClient();
const twitch = new TwitchClient(db);
const scheduler = new SchedulerClient();
const ExpressApp = express();
const GUEST_TTL_DAYS = 7;
const GUEST_TTL_MS = GUEST_TTL_DAYS * 86400 * 1000; 
const DB_TOKEN_TTL_SEC = 30 * 60;

ExpressApp.use(cookieParser(process.env.COOKIE_SIGNING_KEY as string));

ExpressApp.get('/api/auth/dbToken', async (req, res)=> {
  const session = req.signedCookies["session"];
  if(!session){
    res.sendStatus(401);
  }else{
    const secret = await db.createUserToken(session.userId, DB_TOKEN_TTL_SEC);
    res.status(200).json({ secret, expiresAt: Date.now() + DB_TOKEN_TTL_SEC * 1000 });
  }
});

ExpressApp.post('/api/auth/loginAsGuest', async (req, res)=> {
  if(req.signedCookies["session"]){
    res.status(200).json({});
  }else {
    const userId = await db.createGuestUser(GUEST_TTL_DAYS);
    const secret = await db.createUserToken(userId, DB_TOKEN_TTL_SEC);
    new Cookie("session", { userId, isGuest: true }, GUEST_TTL_MS).addToResponse(res);
    res.status(200).json({ userId, dbToken: { secret, expiresAt: Date.now() + DB_TOKEN_TTL_SEC * 1000 }});
  }
});

ExpressApp.get('/api/twitch/:channelName', async (req, res) => {
  const userLogin = req.params.channelName.toLowerCase();
  try {
    const result = await db.getChannelAndStreamWithLogin(userLogin);
    res.status(200).json(result);
  } catch (e) {
    try {
      const stream = await twitch.api.helix.streams.getStreamByUserName(userLogin);
      if (stream) {
        const { data, didCreate } = await db.setChannelAndStream(stream);
        if (didCreate) {
          await scheduler.scheduleBatch([
            {
              name: 'startMonitoringChannel',
              data: { channelId: stream.userId },
              delaySeconds: 0,
            },
            {
              name: 'startMonitoringStreams',
              data: { channelId: stream.userId },
              delaySeconds: 0,
            },
          ]);
        }
        res.status(200).json(data);
      } else {
        res.sendStatus(404);
      }
    }catch(e){
      console.error(e);
      res.sendStatus(500);
    }
    
  }
});

ExpressApp.use(express.static(process.env.PUBLIC_FOLDER_PATH as string));

ExpressApp.get('/twitch/:channelName', (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), `${process.env.PUBLIC_FOLDER_PATH}/index.html`));
});

export default ExpressApp;
