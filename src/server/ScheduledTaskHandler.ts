import DBClient from './DBClient';
import SchedulerClient from './SchedulerClient';
import TwitchClient from './TwitchClient';

type Task = {
  name: string;
  data: any;
};

const db = new DBClient();
const twitch = new TwitchClient(db);
const scheduler = new SchedulerClient();
const MONITOR_STREAMS_HEAD_START_SEC = 10;
const GET_STREAM_UPDATES_HEAD_START_SEC = 2;

const getMonitorStreamsDelaySeconds = (handlerStartSeconds: number): number => {
  const secondsBefore = TwitchClient.getSecondsBeforeNextViewerCountUpdate();
  return secondsBefore >= handlerStartSeconds
    ? secondsBefore - handlerStartSeconds
    : (secondsBefore - handlerStartSeconds) + 30;
};

export default (event: any) => {
  let tasks = [];
  if (event.Records) {
    tasks = event.Records.map((r: any) => JSON.parse(r.body));
  } else {
    tasks = event;
  }
  return Promise.allSettled(tasks.map(async (task: Task) => {
    try {
      if (task.name === 'startMonitoringChannel' && !process.env.LOCAL) {
        await twitch.subToChannelEvents(task.data.channelId);
      } else if (task.name === 'startMonitoringStreams') {
        if (await db.setIsMonitoringStreams()) {
          scheduler.schedule({
            name: 'monitorStreams',
            data: {},
            delaySeconds: getMonitorStreamsDelaySeconds(MONITOR_STREAMS_HEAD_START_SEC),
          });
        }
      } else if (task.name === 'monitorStreams') {
        await db.forEachPageOfStreams((page) => scheduler.schedule({
          name: 'getStreamUpdates',
          data: page,
          delaySeconds: getMonitorStreamsDelaySeconds(GET_STREAM_UPDATES_HEAD_START_SEC),
        }), TwitchClient.MaxWebsocketTopicsPerIP);
        scheduler.schedule({
          name: 'monitorStreams',
          data: {},
          delaySeconds: getMonitorStreamsDelaySeconds(MONITOR_STREAMS_HEAD_START_SEC) + 30,
        });
      } else if (task.name === 'getStreamUpdates') {
        const updates = await twitch.getStreamViewerCounts(Object.keys(task.data));
        await db.updateStreamViewerCounts(
          Object.keys(updates).reduce((mapping: any, channelId)=> {
            mapping[task.data[channelId]] = updates[channelId];
            return mapping;
          }, {})
        );
      }
    }catch(e){
      console.error(e);
    }
    
  }));
};
