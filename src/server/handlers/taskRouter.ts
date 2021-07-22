import DB from '../../common/DBClient';
import Scheduler, { ScheduledTask, TaskType } from '../Scheduler';
import TwitchClient from '../TwitchClient';
import { handleTaskPredictionEnd, handleTaskProcessPrediction } from './predictionHandlers';
import {
  handleTaskMonitorChannel,
  handleTaskMonitorStreams,
  handleTaskGetRealTimeStreamMetrics,
} from './twitchHandlers';

const db = new DB(process.env.FAUNADB_SECRET as string);
const twitch = new TwitchClient(db);
const scheduler = new Scheduler();

const routingTable: { [key:string]: (task:ScheduledTask) => Promise<void> } = {
  [TaskType.MonitorChannel]: (task) => handleTaskMonitorChannel(task.data, twitch),
  [TaskType.MonitorStreams]: (task) => handleTaskMonitorStreams(task, scheduler, db),
  [TaskType.GetRealTimeStreamMetrics]:
  (task) => handleTaskGetRealTimeStreamMetrics(task.data, twitch, db),
  [TaskType.ProcessPrediction]: (task) => handleTaskProcessPrediction(task, scheduler, db),
  [TaskType.PredictionEnd]: (task) => handleTaskPredictionEnd(task.data, db),
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
