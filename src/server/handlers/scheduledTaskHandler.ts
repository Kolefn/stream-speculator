import DB, { FaunaRef } from '../../common/DBClient';
import { getPredictionReturn } from '../../common/predictionUtils';
import { Prediction, StreamMetric } from '../../common/types';
import Scheduler, { ScheduledTask, StreamMonitoringInitialTask, TaskType } from '../Scheduler';
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
            await twitch.subToChannelEvents(task.data.channelId);
          }
          await scheduler.schedule(StreamMonitoringInitialTask);
          break;
        case TaskType.MonitorStreams:
          const nextTasks: ScheduledTask[] = [];
          const streamsChanged = await db.exec<boolean>(
            DB.ifTrueSetFalse(DB.scheduledTasks.doc(TaskType.MonitorStreams.toString()), 'streamsChanged'),
          );
          if (streamsChanged) {
            await db.forEachPage<FaunaRef>(DB.channels.with('isLive', true), async (page) => {
              if (page.data.length > 0) {
                nextTasks.push({
                  type: TaskType.GetRealTimeStreamMetrics,
                  data: page.data.map((ref) => ref.id),
                });
              }
            }, { size: 450 });
          } else {
            nextTasks.push(...task.data.subTasks);
          }

          if (nextTasks.length > 0) {
            nextTasks.push({ ...task, data: { subTasks: [...nextTasks] }, isRepeat: true });
            await scheduler.scheduleBatch(nextTasks);
          } else {
            await Scheduler.end(task);
          }
          break;
        case TaskType.GetRealTimeStreamMetrics:
          const updates = await twitch.getStreamViewerCounts(task.data);
          await db.exec(DB.batch(...Object.keys(updates).map((channelId) => {
            const update = updates[channelId];
            return DB.update(DB.streamMetric(update.channelId, update.type), update);
          })));
          break;
        case TaskType.ProcessPrediction:
          const prediction = task.data as Prediction;
          const expiresAt = prediction.createdAt - prediction.window * 1000;
          if (expiresAt - Date.now() > 1000) {
            await scheduler.schedule(task);
          } else {
            const metric = await db.exec<StreamMetric>(
              DB.get(
                DB.streamMetric(prediction.channelId, prediction.metric),
              ),
            );
            const payout = getPredictionReturn(prediction, metric.value) * prediction.multiplier;
            const predictionUpdate = DB.update(
              DB.predictions.doc(prediction.id),
              { endMetricVal: metric.value },
            );
            await db.exec(
              payout > 0 ? DB.batch(
                DB.updateUserCoins(prediction.userId, payout),
                predictionUpdate,
              ) : predictionUpdate,
            );
          }
          break;
        default:
          throw new Error(`Unkown task type ${task.type}`);
      }
    } catch (e) {
      console.error(e);
    }
  }));
};
