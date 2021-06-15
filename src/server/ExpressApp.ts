import express from 'express';
import path from 'path';
import DBClient from './DBClient';
import SchedulerClient from './SchedulerClient';
import TwitchClient from './TwitchClient';

const db = new DBClient();
const twitch = new TwitchClient(db);
const scheduler = new SchedulerClient();
const ExpressApp = express();

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

ExpressApp.use('/twitch/:channelName', (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), `${process.env.PUBLIC_FOLDER_PATH}/index.html`));
});

export default ExpressApp;
