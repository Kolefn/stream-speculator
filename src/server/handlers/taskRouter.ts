import DB from '../../common/DBClient';
import Scheduler, { ScheduledTask, TaskType } from '../Scheduler';
import TwitchClient from '../TwitchClient';
import { handleTaskCreatePrediction, handleTaskPredictionEvent } from './predictionHandlers';
import {
  handleTaskMonitorChannel,
  handleTaskMonitorStreams,
  handleTaskGetRealTimeStreamMetrics,
  handleTaskStreamEvent,
} from './twitchHandlers';

const db = new DB(process.env.FAUNADB_SECRET as string);
const twitch = new TwitchClient(db);
const scheduler = new Scheduler();

const routingTable: { [key:string]: (task:ScheduledTask) => Promise<void> } = {
  [TaskType.MonitorChannel]: (task) => handleTaskMonitorChannel(task.data, twitch),
  [TaskType.MonitorStreams]: (task) => handleTaskMonitorStreams(task, scheduler, db),
  [TaskType.GetRealTimeStreamMetrics]:
  (task) => handleTaskGetRealTimeStreamMetrics(task.data, twitch, db),
  [TaskType.PredictionEvent]: (task) => handleTaskPredictionEvent(task.data, db, scheduler),
  [TaskType.StreamEvent]: (task) => handleTaskStreamEvent(task.data, scheduler, db),
  [TaskType.CreatePrediction]: (task) => handleTaskCreatePrediction(
    task.data.channelId,
    db,
    twitch,
    scheduler,
  ),
};
export default (event: any) => {
  let tasks = [];
  if (event.Records) {
    tasks = event.Records.map((r: any) => JSON.parse(r.body));
  } else {
    tasks = event;
  }
  return Promise.allSettled(tasks.map(async (task: ScheduledTask) => {
    try {
      await routingTable[task.type](task);
    } catch (e) {
      console.error(e);
    }
  }));
};
