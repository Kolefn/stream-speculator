import express, { Response } from 'express';
import path from 'path';
import cookieParser from "cookie-parser";
import APIResponse, { APIResponseStatus } from './APIResponse';
import { getDBToken, loginAsGuest } from './handlers/authHandlers';
import { getTwitchChannelPageData } from './handlers/twitchHandlers';

const expressify = async <T>(responder: () => Promise<{} | APIResponse<T>>, res: Response) => {
  try {
    const response = await responder();
    if(response instanceof APIResponse){
      response.send(res);
    }else{
      APIResponse.send({ data: response }, res);
    }
  }catch(e){
    APIResponse.send({ status: APIResponseStatus.ServerError }, res);
  }
};

const ExpressApp = express();

ExpressApp.use(cookieParser(process.env.COOKIE_SIGNING_KEY as string));

ExpressApp.get('/api/auth/dbToken', async (req, res)=> {
  const session = req.signedCookies["session"];
  expressify(()=> getDBToken(session), res);
});

ExpressApp.post('/api/auth/loginAsGuest', async (req, res)=> {
  expressify(()=> loginAsGuest(req.signedCookies["session"]), res);
});

ExpressApp.get('/api/twitch/:channelName', async (req, res) => {
  expressify(()=> getTwitchChannelPageData(req.params.channelName), res);
});

ExpressApp.use(express.static(process.env.PUBLIC_FOLDER_PATH as string));

ExpressApp.get('/twitch/:channelName', (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), `${process.env.PUBLIC_FOLDER_PATH}/index.html`));
});

export default ExpressApp;
