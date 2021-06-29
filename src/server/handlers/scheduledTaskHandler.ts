import DB, { FaunaRef } from '../../common/DBClient';
import Scheduler, { ScheduledTask, StreamMonitoringTasks, TaskType } from '../Scheduler';
import TwitchClient from '../TwitchClient';

const db = new DB(process.env.FAUNADB_SECRET as string);
const twitch = new TwitchClient(db);
const scheduler = new Scheduler();

export default (event: any) => {
  let tasks = [];
  if (event.Records) {
    tasks = event.Records.map((r: any) => JSON.parse(r.body));
  } else {
    tasks = event;
  }
  return Promise.allSettled(tasks.map(async (task: ScheduledTask) => {
    try {
      switch (task.type) {
        case TaskType.MonitorChannel:
          if (!process.env.LOCAL) {
            // await twitch.subToChannelEvents(task.data.channelId);
          }
          await scheduler.scheduleBatch(StreamMonitoringTasks);
          break;
        case TaskType.MonitorStreams:
          const nextTasks: ScheduledTask[] = [];
          await db.forEachPage<FaunaRef>(DB.channels.with('isLive', true), async (page) => {
            if (page.data.length > 0) {
              nextTasks.push({
                type: TaskType.GetRealTimeStreamMetrics,
                data: page.data.map((ref) => ref.id),
              });
            }
          }, { size: 500 });
          if (nextTasks.length > 0) {
            nextTasks.push({ ...task, isRepeat: true });
            await scheduler.scheduleBatch(nextTasks);
          } else {
            await Scheduler.end(task);
          }
          break;
        case TaskType.GetRealTimeStreamMetrics:
          const updates = await twitch.getStreamViewerCounts(task.data);
          await db.exec(DB.batch(...Object.keys(updates).map((channelId) => {
            const update = updates[channelId];
            return DB.update(DB.channels.doc(channelId), { stream: { viewerCount: update.value } });
            // return DB.batch(
            //   DB.create<StreamMetric>(DB.streamMetrics, update),
            //   DB.update(DB.channels.doc(channelId), { stream: { viewerCount: update.value } })
            // );
          })));
          break;
        default:
          throw new Error(`Unkown task type ${task.type}`);
      }
    } catch (e) {
      console.error(e);
    }
  }));
};
