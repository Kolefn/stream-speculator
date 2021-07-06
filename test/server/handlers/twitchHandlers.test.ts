import crypto from 'crypto';
import DBClient from '../../../src/common/DBClient';
import { handleTwitchWebhook } from '../../../src/server/handlers/twitchHandlers';
import Scheduler, { StreamMonitoringTasks } from '../../../src/server/Scheduler';

const getSignature = (headers: any, rawBody: string) : string => {
  process.env.TWITCH_WEBHOOK_SECRET = '1234567';
  return crypto
    .createHmac('sha256', process.env.TWITCH_WEBHOOK_SECRET as string)
    .update(headers['twitch-eventsub-message-id'] + headers['twitch-eventsub-message-timestamp'] + rawBody)
    .digest('hex');
};

const headers = {
  'twitch-eventsub-message-id': '1234',
  'twitch-eventsub-message-timestamp': new Date().toISOString(),
  'twitch-eventsub-message-signature': 'sha256=190saf09usd8f7298375123fasdef',
  'twitch-eventsub-message-type': 'notification',
};

const buildWebhookHeaders = (rawBody: string, type = 'notification') => ({
  ...headers,
  'twitch-eventsub-message-signature': `sha256=${getSignature(headers, rawBody)}`,
  'twitch-eventsub-message-type': type,
});

describe('handleTwitchWebhook', () => {
  const clients = {
    scheduler: new Scheduler(),
    db: new DBClient(''),
  };

  it('should return 400 if any of the headers are not set', () => Promise.all(Object.keys(headers).map(async (key: string) => {
    const temp: any = { ...headers };
    delete temp[key];
    const response = await handleTwitchWebhook(temp, '', clients);
    return expect(response.options.status).toEqual(400);
  })));

  it('should return 401 if the signature is invalid', async () => {
    const rawBody = JSON.stringify({ hello: 'world' });

    const result = await handleTwitchWebhook(
      buildWebhookHeaders(rawBody),
      JSON.stringify({ other: 'body' }),
      clients,
    );
    expect(result.options.status).toEqual(401);
  });

  it('should handle webhook_callback_verification', async () => {
    const rawBody = JSON.stringify({
      challenge: '12345',
      subscription: {
        id: 'abcdef',
        type: 'stream.online',
        condition: {
          broadcaster_user_id: '984123',
        },
      },
    });
    const exec = jest.spyOn(clients.db, 'exec');
    const create = jest.spyOn(DBClient, 'create');
    exec.mockResolvedValueOnce({});
    const result = await handleTwitchWebhook(
      buildWebhookHeaders(rawBody, 'webhook_callback_verification'),
      rawBody,
      clients,
    );
    expect(create).toHaveBeenCalledWith(DBClient.webhookSubs, {
      id: 'abcdef',
      type: 'stream.online',
      channelId: '984123',
    });
    expect(exec).toHaveBeenCalled();
    expect(result.options.status).toEqual(200);
    expect(result.options.data).toEqual('12345');
    expect(result.options.contentType).toEqual('plain/text');
  });

  it('should handle notification for stream.online', async () => {
    const event = {
      id: '9001',
      broadcaster_user_id: '984123',
      started_at: '2020-10-11T10:11:12.123Z',
    };
    const rawBody = JSON.stringify({
      subscription: {
        type: 'stream.online',
      },
      event,
    });
    const exec = jest.spyOn(clients.db, 'exec');
    const update = jest.spyOn(DBClient, 'update');
    const batch = jest.spyOn(clients.scheduler, 'scheduleBatch');
    exec.mockResolvedValueOnce({});
    batch.mockResolvedValueOnce();
    const response = await handleTwitchWebhook(buildWebhookHeaders(rawBody), rawBody, clients);
    expect(update).toHaveBeenCalledWith(DBClient.channels.doc(event.broadcaster_user_id), {
      isLive: true,
      stream: {
        id: event.id,
        startedAt: new Date(event.started_at).getTime(),
        viewerCount: 0,
      },
    });
    expect(exec).toHaveBeenCalled();
    expect(batch).toHaveBeenCalledWith(StreamMonitoringTasks);
    expect(response.options.status).toEqual(200);
  });

  it('should handle notification for stream.offline', async () => {
    const event = {
      broadcaster_user_id: '984123',
    };
    const rawBody = JSON.stringify({
      subscription: {
        type: 'stream.offline',
      },
      event,
    });
    const exec = jest.spyOn(clients.db, 'exec');
    const update = jest.spyOn(DBClient, 'update');
    exec.mockResolvedValueOnce({});
    const response = await handleTwitchWebhook(buildWebhookHeaders(rawBody), rawBody, clients);
    expect(update).toHaveBeenCalledWith(DBClient.channels.doc(event.broadcaster_user_id), {
      isLive: false,
    });
    expect(exec).toHaveBeenCalled();
    expect(response.options.status).toEqual(200);
  });
});
