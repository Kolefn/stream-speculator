import { StreamMetric } from '../../common/types';
import { default as DB, FaunaRef } from '../DBClient';
import Scheduler, { ScheduledTask, TaskType } from '../Scheduler';
import TwitchClient from '../TwitchClient';

const db = new DB();
const twitch = new TwitchClient(db);
const scheduler = new Scheduler();
const MONITOR_STREAMS_HEAD_START_SEC = 5;

export default (event: any) => {
  let tasks = [];
  if (event.Records) {
    tasks = event.Records.map((r: any) => JSON.parse(r.body));
  } else {
    tasks = event;
  }
  return Promise.allSettled(tasks.map(async (task: ScheduledTask) => {
    try {
      switch(task.type){
        case TaskType.MonitorChannel:
          if(!process.env.LOCAL){
            await twitch.subToChannelEvents(task.data.channelId);
          }
          await scheduler.scheduleBatch([
            {
              type: TaskType.MonitorStreams,
              when: { at: { second: 30 - MONITOR_STREAMS_HEAD_START_SEC }}
            },
            {
              type: TaskType.MonitorStreams,
              when: { at: { second: 60 - MONITOR_STREAMS_HEAD_START_SEC }}
            }
          ]);
        break;
        case TaskType.MonitorStreams:
          await scheduler.schedule({...task, isRepeat: true });
          const nextTasks: ScheduledTask[] = [];
          await db.forEachPage<FaunaRef>(DB.channels.fieldExists("stream"), async (page)=> {
            nextTasks.push({
              type: TaskType.GetRealTimeStreamMetrics,
              data: page.data.map((ref)=> ref.id),
            })
          }, { size: 500 });

          await scheduler.scheduleBatch(nextTasks);
          break;
        case TaskType.GetRealTimeStreamMetrics:
          const updates = await twitch.getStreamViewerCounts(task.data);
          await db.exec(DB.batch(...Object.keys(updates).map((channelId)=> {
            return DB.create<StreamMetric>(DB.streamMetrics, updates[channelId]);
          })));
      }
    }catch(e){
      console.error(e);
    }
    
  }));
};
