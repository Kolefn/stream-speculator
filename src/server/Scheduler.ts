// eslint-disable-next-line import/no-extraneous-dependencies
import SQSClient from 'aws-sdk/clients/sqs';
import DB from '../common/DBClient';

const db = new DB(process.env.FAUNADB_SECRET as string);

export enum TaskType {
  MonitorChannel = 0,
  MonitorStreams = 1,
  GetRealTimeStreamMetrics = 2,
}

export type ScheduledTask = {
  type: TaskType;
  data?: any;
  when?: {
    at?: {
      second: number;
    };
  }[],
  isRepeat?: boolean,
};

export const StreamMonitoringInitialTask: ScheduledTask = {
  type: TaskType.MonitorStreams,
  when: [{ at: { second: 27 } }, { at: { second: 57 } }],
  data: { streamsChanged: true },
};

const getDelaySeconds = (task: ScheduledTask) : number => {
  if (task.when && task.when.length > 0) {
    const now = new Date();
    return task.when.reduce((minDelay, w) => {
      const sec = now.getSeconds() + (now.getMilliseconds() / 1000);
      const until = w.at?.second as number - sec;
      const delay = Math.floor(until < 0 ? until + 60 : until);
      return Math.min(minDelay, (task.isRepeat && delay === 0) ? 60 : delay);
    }, Infinity);
  }

  return 0;
};

const repeatingTaskQuery = (task: ScheduledTask) => DB.updateOrCreate(
  DB.scheduledTasks.doc(task.type.toString()), (task.data ?? {}),
);

const isInitial = (task: ScheduledTask) : boolean => Boolean(task.when && !task.isRepeat);

export default class Scheduler {
  static localHandler: (task: ScheduledTask) => Promise<void>;

  private client: SQSClient;

  constructor() {
    this.client = new SQSClient({
      region: process.env.REGION,
    });
  }

  static async end(task: ScheduledTask) : Promise<void> {
    await db.exec(DB.deleteExists(DB.scheduledTasks.doc(task.type.toString())));
  }

  async schedule(task: ScheduledTask) : Promise<boolean> {
    if (isInitial(task)) {
      const created = await db.exec<boolean>(repeatingTaskQuery(task));
      if (!created) {
        return false;
      }
    }

    if (process.env.LOCAL) {
      setTimeout(() => Scheduler.localHandler(task), getDelaySeconds(task) * 1000);
      return true;
    }
    await this.client.sendMessage({
      QueueUrl: process.env.SQS_QUEUE_URL as string,
      MessageBody: JSON.stringify(task),
      DelaySeconds: getDelaySeconds(task),
    }).promise();
    return true;
  }

  async scheduleBatch(inTasks: ScheduledTask[]) : Promise<void> {
    let tasks = inTasks;
    const initialTasks = tasks.filter((t) => isInitial(t));
    if (initialTasks.length > 0) {
      const didCreate = await db.exec<{ [key: string] : boolean }>(
        DB.named(
          initialTasks.reduce((map: any, task) => {
            if (!map[task.type]) {
              // eslint-disable-next-line no-param-reassign
              map[task.type] = repeatingTaskQuery(task);
            }
            return map;
          }, {}),
        ),
      );

      tasks = tasks.filter((t) => !isInitial(t) || didCreate[t.type]);
    }

    if (tasks.length === 0) {
      return;
    }

    if (process.env.LOCAL) {
      tasks.forEach((task) => {
        setTimeout(() => Scheduler.localHandler(task), getDelaySeconds(task) * 1000);
      });
    } else {
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
