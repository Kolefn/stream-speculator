import express from 'express';
import path from 'path';

const ExpressApp = express();
ExpressApp.set('view engine', 'ejs');
ExpressApp.set('views', path.join(process.cwd(), process.env.VIEWS_FOLDER_PATH as string));

ExpressApp.use(express.static(process.env.PUBLIC_FOLDER_PATH as string));
ExpressApp.get('/twitch/:channelName', (req, res) => {
  res.render('twitch/channel', { channelName: req.params.channelName });
});
export default ExpressApp;
