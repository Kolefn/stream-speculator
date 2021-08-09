import {
  AccessToken, ApiClient, HelixEventSubSubscription, HelixEventSubTransportOptions,
} from 'twitch';
import { BasicPubSubClient } from 'twitch-pubsub-client';
import Cryptr from 'cryptr';
import { DBClient, StreamMetric, StreamMetricType } from '@stream-speculator/common';
import TwitchAuthProvider from './TwitchAuthProvider';
import { TWITCH_WEBHOOK_SECRET, TWITCH_WEBHOOK_CALLBACK, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, TWITCH_TOKEN_ENCRYPTION_KEY } from './environment';

type PubSubViewerCountMessageData = {
  type: 'viewcount' | 'commercial';
  server_time: number;
  viewers: number;
};

type StreamMetricUpdateByChannel = { [channelId: string] : StreamMetric };

const EVENTSUB_OPTIONS: HelixEventSubTransportOptions = {
  secret: TWITCH_WEBHOOK_SECRET as string,
  callback: TWITCH_WEBHOOK_CALLBACK as string,
  method: 'webhook',
};

export default class TwitchClient {
  static readonly MaxWebsocketTopicsPerIP = 500;

  api: ApiClient;

  pubsub: BasicPubSubClient;

  auth: TwitchAuthProvider;

  db: DBClient;

  constructor(dbClient: DBClient) {
    this.auth = new TwitchAuthProvider(
      TWITCH_CLIENT_ID as string,
      TWITCH_CLIENT_SECRET as string,
      dbClient,
    );
    this.pubsub = new BasicPubSubClient();
    this.db = dbClient;
    this.api = new ApiClient({ authProvider: this.auth });
  }

  async deleteSubs(subIds: string[]) : Promise<void> {
    await Promise.all(subIds.map((id) => this.api.helix.eventSub.deleteSubscription(id)));
  }

  async subToPredictionEvents(channelId: string)
    : Promise<{ [key:string]: HelixEventSubSubscription }> {
    const predBeginReq = this.api.helix.eventSub.subscribeToChannelPredictionBeginEvents(
      channelId,
      EVENTSUB_OPTIONS,
    );

    const predEndReq = this.api.helix.eventSub.subscribeToChannelPredictionEndEvents(
      channelId,
      EVENTSUB_OPTIONS,
    );

    const predProgReq = this.api.helix.eventSub.subscribeToChannelPredictionProgressEvents(
      channelId,
      EVENTSUB_OPTIONS,
    );

    const predLockReq = this.api.helix.eventSub.subscribeToChannelPredictionLockEvents(
      channelId,
      EVENTSUB_OPTIONS,
    );

    return {
      predictionBeginSub: await predBeginReq,
      predictionEndSub: await predEndReq,
      predictionProgressSub: await predProgReq,
      predictionLockSub: await predLockReq,
    };
  }

  async subToChannelEvents(channelId: string)
    : Promise<{ [key:string]: HelixEventSubSubscription }> {
    const onlineReq = this.api.helix.eventSub.subscribeToStreamOnlineEvents(
      channelId,
      EVENTSUB_OPTIONS,
    );
    const offlineReq = this.api.helix.eventSub.subscribeToStreamOfflineEvents(
      channelId,
      EVENTSUB_OPTIONS,
    );
    return {
      onlineSub: await onlineReq,
      offlineSub: await offlineReq,
    };
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
    const output: StreamMetricUpdateByChannel = {};
    let outputSize = 0;
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(output);
      }, TwitchClient.getSecondsBeforeNextViewerCountUpdate() * 1000 + 2000);
      this.pubsub.connect().then(()=> {
        this.pubsub.listen(channelIds.map((id) => `video-playback-by-id.${id}`), this.auth).then(()=> {
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
      });
    });
    await this.pubsub.disconnect();
    return output;
  }

  static encryptToken(token: AccessToken) : string {
    return new Cryptr(TWITCH_TOKEN_ENCRYPTION_KEY as string).encrypt(JSON.stringify({
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiryDate?.getTime(),
    }));
  }
}
