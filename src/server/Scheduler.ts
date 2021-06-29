// eslint-disable-next-line import/no-extraneous-dependencies
import SQSClient from 'aws-sdk/clients/sqs';
import {default as DB, FaunaDocCreate } from '../common/DBClient';

const db = new DB(process.env.FAUNADB_SECRET as string);

export enum TaskType {
  MonitorChannel = 0,
  MonitorStreams = 1,
  GetRealTimeStreamMetrics = 2,
};

export type ScheduledTask = { 
  type: TaskType; 
  data?: any; 
  when?: {
    at?: {
      second: number;
    };
  },
  isRepeat?: boolean,
};

const getDelaySeconds = (task: ScheduledTask) : number => {
  if(task.when?.at){
    const now = new Date();
    if(!Number.isNaN(task.when?.at?.second)){
      const sec = now.getSeconds() + (now.getMilliseconds() / 1000);
      const until = task.when.at.second - sec;
      const delay = Math.floor(until < 0 ? until + 60 : until);
      return (task.isRepeat && delay === 0) ? 60 : delay;
    }
  }

  return 0;
};

const createScheduledTaskQuery = (task: ScheduledTask) => {
  return DB.create(DB.scheduledTasks, { id: task.type.toString(), ...(task.data ?? {}) });
};

const isInitial = (task: ScheduledTask) : boolean => {
  return Boolean(task.when?.at && !task.isRepeat);
};

export default class Scheduler {
  static localHandler: (task: ScheduledTask) => Promise<void>;
  private client: SQSClient;

  constructor() {
    this.client = new SQSClient({
      region: process.env.REGION,
    });
  }

  async end(task: ScheduledTask) : Promise<void> {
    await db.exec(DB.deleteExists(DB.scheduledTasks.doc(task.type.toString())));
  }

  async schedule(task: ScheduledTask) : Promise<boolean> {
    if(isInitial(task)){
      const result = await db.exec<FaunaDocCreate>(createScheduledTaskQuery(task));
      if(!result.created){
        return false;
      }
    }

    if(process.env.LOCAL){
      setTimeout(()=> Scheduler.localHandler(task), getDelaySeconds(task) * 1000);
      return true;
    }else{
      await this.client.sendMessage({
        QueueUrl: process.env.SQS_QUEUE_URL as string,
        MessageBody: JSON.stringify(task),
        DelaySeconds: getDelaySeconds(task),
      }).promise();
      return true;
    }
  }

  async scheduleBatch(tasks: ScheduledTask[]) : Promise<void> {
    const repeatTasks = tasks.filter((t)=> t.when?.at);
    if(repeatTasks.length > 0){
      const results = await db.exec<{ [key: string] : FaunaDocCreate }>(
        DB.named(
          repeatTasks.reduce((map: any, task)=> {
            if(!map[task.type]){
              map[task.type] = createScheduledTaskQuery(task);
            }
            return map;
          }, {})
        )
      );

      tasks = tasks.filter((t)=> !isInitial(t) || results[t.type].created);
    }

    if(tasks.length === 0){
      return;
    }

    if(process.env.LOCAL){
      tasks.map((task)=> setTimeout(()=> Scheduler.localHandler(task),  getDelaySeconds(task) * 1000));
    }else{
      await this.client.sendMessageBatch({
        QueueUrl: process.env.SQS_QUEUE_URL as string,
        Entries: tasks.map((task, i) => ({
          Id: `${task.type}${i}`,
          MessageBody: JSON.stringify(task),
          DelaySeconds: getDelaySeconds(task),
        })),
      }).promise();
    }
  }
}
