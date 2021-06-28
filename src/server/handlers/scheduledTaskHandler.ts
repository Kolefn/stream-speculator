import { StreamMetric } from '../../common/types';
import { default as DB, FaunaRef } from '../../common/DBClient';
import Scheduler, { ScheduledTask, TaskType } from '../Scheduler';
import TwitchClient from '../TwitchClient';

const db = new DB(process.env.FAUNADB_SECRET as string);
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
          const nextTasks: ScheduledTask[] = [];
          await db.forEachPage<FaunaRef>(DB.channels.fieldExists("stream"), async (page)=> {
            nextTasks.push({
              type: TaskType.GetRealTimeStreamMetrics,
              data: page.data.map((ref)=> ref.id),
            })
          }, { size: 500 });
          if(nextTasks.length > 0){
            nextTasks.push({...task, isRepeat: true });
            await scheduler.scheduleBatch(nextTasks);
          }else{
            await scheduler.end(task);
          }
          break;
        case TaskType.GetRealTimeStreamMetrics:
          const updates = await twitch.getStreamViewerCounts(task.data);
          await db.exec(DB.batch(...Object.keys(updates).map((channelId)=> {
            const update = updates[channelId];
            return DB.batch(
              DB.create<StreamMetric>(DB.streamMetrics, update),
              DB.update(DB.channels.doc(channelId), { stream: { viewerCount: update.value } })
            );
          })));
          break;
      }
    }catch(e){
      console.error(e);
    }
    
  }));
};
