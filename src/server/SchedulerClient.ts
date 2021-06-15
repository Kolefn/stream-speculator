// eslint-disable-next-line import/no-extraneous-dependencies
import SQSClient from 'aws-sdk/clients/sqs';

type ScheduledTask = { name: string; data: any; delaySeconds: number; };
export default class SchedulerClient {
  static localHandler: (task: ScheduledTask) => Promise<void>;
  private client: SQSClient;

  constructor() {
    this.client = new SQSClient({
      region: process.env.REGION,
    });
  }

  async schedule(task: ScheduledTask) : Promise<void> {
    if(process.env.LOCAL){
      setTimeout(()=> SchedulerClient.localHandler(task), task.delaySeconds * 1000);
    }else{
      await this.client.sendMessage({
        QueueUrl: process.env.SQS_QUEUE_URL as string,
        MessageBody: JSON.stringify({ name: task.name, data: task.data }),
        DelaySeconds: task.delaySeconds,
      });
    }
  }

  async scheduleBatch(tasks: ScheduledTask[]) : Promise<void> {
    if(process.env.LOCAL){
      tasks.map((task)=> setTimeout(()=> SchedulerClient.localHandler(task), task.delaySeconds * 1000));
    }else{
      await this.client.sendMessageBatch({
        QueueUrl: process.env.SQS_QUEUE_URL as string,
        Entries: tasks.map((task, i) => ({
          Id: `${task.name}${i}`,
          MessageBody: JSON.stringify({ name: task.name, data: task.data }),
          DelaySeconds: task.delaySeconds,
        })),
      });
    }
    
  }
}
