import { ApiClient, HelixEventSubSubscription, HelixEventSubTransportOptions } from 'twitch';
import { BasicPubSubClient } from 'twitch-pubsub-client';
import DBClient from '../common/DBClient';
import TwitchAuthProvider from './TwitchAuthProvider';
import { StreamMetric, StreamMetricType } from '../common/types';

type PubSubViewerCountMessageData = {
  type: 'viewcount' | 'commercial';
  server_time: number;
  viewers: number;
};

type StreamMetricUpdateByChannel = { [channelId: string] : StreamMetric };

export default class TwitchClient {
  static readonly MaxWebsocketTopicsPerIP = 500;

  api: ApiClient;

  pubsub: BasicPubSubClient;

  auth: TwitchAuthProvider;

  db: DBClient;

  constructor(dbClient: DBClient) {
    this.auth = new TwitchAuthProvider(
      process.env.TWITCH_CLIENT_ID as string,
      process.env.TWITCH_CLIENT_SECRET as string,
      dbClient,
    );
    this.pubsub = new BasicPubSubClient();
    this.db = dbClient;
    this.api = new ApiClient({ authProvider: this.auth });
  }

  async subToChannelEvents(channelId: string)
    : Promise<{ [key:string]: HelixEventSubSubscription }> {
    const subOptions: HelixEventSubTransportOptions = {
      secret: process.env.TWITCH_WEBHOOK_SECRET as string,
      callback: process.env.TWITCH_WEBHOOK_CALLBACK as string,
      method: 'webhook',
    };
    const onlineReq = this.api.helix.eventSub.subscribeToStreamOnlineEvents(channelId, subOptions);
    const offlineReq = this.api.helix.eventSub.subscribeToStreamOfflineEvents(
      channelId,
      subOptions,
    );

    const onlineSub = await onlineReq;
    const offlineSub = await offlineReq;

    return { onlineSub, offlineSub };
  }

  static getSecondsBeforeNextViewerCountUpdate(): number {
    const now = new Date();
    const sec = now.getSeconds() + (now.getMilliseconds() / 1000);
    if (sec >= 30) {
      return 60 - sec;
    }
    return 30 - sec;
  }

  async getStreamViewerCounts(channelIds: string[]): Promise<StreamMetricUpdateByChannel> {
    await this.pubsub.connect();
    await this.pubsub.listen(channelIds.map((id) => `video-playback-by-id.${id}`), this.auth);
    const output: StreamMetricUpdateByChannel = {};
    let outputSize = 0;
    const listenTime = Date.now();
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(output);
      }, TwitchClient.getSecondsBeforeNextViewerCountUpdate() * 1000 + 2000);

      this.pubsub.onMessage((topic, anyData) => {
        const data = anyData as any as PubSubViewerCountMessageData;
        const channelId: string = topic.split('.')[1];
        if (data.type === 'viewcount') {
          output[channelId] = {
            channelId,
            type: StreamMetricType.ViewerCount,
            value: data.viewers,
            timestamp: data.server_time * 1000,
          };
          outputSize += 1;
          if (outputSize === channelIds.length) {
            clearTimeout(timeout);
            resolve(output);
          }
        }
      });
    });
    console.log(`Topics arrived after ${((Date.now() - listenTime) / 1000)}s`);
    await this.pubsub.disconnect();
    return output;
  }
}
