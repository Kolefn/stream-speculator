import express from 'express';
import path from 'path';
import DBClient from './DBClient';

const db = new DBClient();
const ExpressApp = express();

ExpressApp.get('/api/twitch/:channelName', async (req, res) => {
  try {
    const result = await db.getChannelAndStreamWithLogin(req.params.channelName);
    res.status(200).json({ data: result });
  } catch (e) {
    res.status(500).json({ error: e });
  }
});

ExpressApp.use(express.static(process.env.PUBLIC_FOLDER_PATH as string));

ExpressApp.use('/twitch/:channelName', (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), `${process.env.PUBLIC_FOLDER_PATH}/index.html`));
});

export default ExpressApp;
