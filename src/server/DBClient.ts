import faunadb, { query as q } from 'faunadb';
import { AccessToken } from 'twitch-auth';
import { HelixStream } from 'twitch';

type Channel = {
  id: string;
  login: string;
};

type LiveStream = {
  id: string;
  channelRef: string;
  startedAt: number;
  viewerCount: number;
};

type ChannelAndStream = {
  channel: Channel;
  stream?: LiveStream;
};

type StreamDocIdByChannelId = { [channelId: string]: string };

export default class DBClient {
  client: faunadb.Client;

  constructor() {
    this.client = new faunadb.Client({ secret: process.env.FAUNADB_SECRET as string });
  }

  async storeTwitchClientAccessToken(token: AccessToken) : Promise<any> {
    const expiryDate = q.Time(token.expiryDate?.toISOString() as string);
    return this.client.query(q.Create(q.Collection('TwitchClientAccessTokens'), {
      ttl: expiryDate,
      data: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiryTime: expiryDate,
        scope: token.scope,
      },
    }));
  }

  async getTwitchClientAccessToken(minMillisBeforeExpire: number = 120000) : Promise<AccessToken> {
    const result: any = await this.client.query(q.Select(['data'],
      q.Get(q.Filter(
        q.Documents(q.Collection('TwitchClientAccessTokens')),
        q.Lambda('documentRef', q.GTE(
          q.ToTime(q.Select(['data', 'expiryTime'], q.Get(q.Var('documentRef')))),
          q.Time(new Date(Date.now() + minMillisBeforeExpire).toISOString()),
        )),
      ))));

    return new AccessToken({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      expires_in: (new Date(result.expiryTime).getTime() - Date.now()) / 1000,
      scope: result.scope,
    });
  }

  async getChannelAndStreamWithLogin(login: string) : Promise<ChannelAndStream> {
    const result = await this.client.query(
      q.Let({
        channelDoc: q.Get(q.Match(q.Index('Channels_by_login'), login)),
      }, q.Let({
        streamsByChannel: q.Match(q.Index('Streams_by_channelRef'), q.Select(['ref'], q.Var('channelDoc'))),
      }, {
        channel: q.Select(['data'], q.Var('channelDoc')),
        stream: q.If(q.IsEmpty(q.Var('streamsByChannel')), null, q.Select(['data'], q.Get(q.Var('streamsByChannel')))),
      })),
    );
    return result as ChannelAndStream;
  }

  async setChannelAndStream({ id, userId, userName, startDate,  viewers }: HelixStream) :
  Promise<{ didCreate: boolean, data: ChannelAndStream }> {
    const channel = {
      id: userId,
      login: userName,
    };
    const stream = {
      channelRef: '',
      id,
      startedAt: startDate.getTime(),
      viewerCount: viewers,
    };
    const channelRef = q.Ref(q.Collection('Channels'), userId);
    const result = await this.client.query(
      q.If(
        q.Exists(channelRef),
        false,
        q.Do(
          q.Create(channelRef, { data: channel }),
          q.Create(q.Ref(q.Collection('Streams'), id), { data: { ...stream, channelRef } })
        ),
      ),
    );

    return { didCreate: Boolean(result), data: { channel, stream } };
  }

  async setIsMonitoringStreams() : Promise<boolean> {
    return Boolean(await this.client.query(
      q.If(
        q.IsEmpty(
          q.Match(q.Index('Metadata_by_flag'), 'isMonitoringStreams'),
        ),
        q.Create(q.Collection('Metadata'), { data: { flag: 'isMonitoringStreams' } }),
        false,
      ),
    ));
  }

  async forEachPageOfStreams(callback:
  (docIdByChannelId: StreamDocIdByChannelId) => Promise<any>,
  pageSize: number): Promise<void> {
    let page: any;
    do {
      // eslint-disable-next-line no-await-in-loop
      page = await this.client.query(
        q.Map(
          q.Paginate(q.Documents(q.Collection('Streams')), { size: pageSize, after: page?.after }),
          q.Lambda(
            'streamRef',
            {
              channelRef: q.Select(['data', 'channelRef'], q.Get(q.Var('streamRef'))),
              streamRef: q.Var('streamRef'),
            },
          ),
        ),
      );
      // eslint-disable-next-line no-await-in-loop
      await callback(
        page.data.reduce((mapping: StreamDocIdByChannelId, data: any) => {
          mapping[data.channelRef.id] = data.streamRef.id;
          return mapping;
        }, {}),
      );
    } while (page.after && page.data.length > 0);
  }

  async updateStreamViewerCounts(updatesByStreamDocId: { [streamDocId: string] : { viewerCount: number, timestamp: number } })
    : Promise<void> {
    await this.client.query(
      q.Map(
        Object.keys(updatesByStreamDocId).map((k)=> ({ docId: k, data: updatesByStreamDocId[k] })), 
        q.Lambda('doc', q.Update(
            q.Ref(q.Collection("Streams"), q.Select(["docId"], q.Var('doc'))),
            {
              data: q.Select(["data"], q.Var('doc'))
            }
          )
        )
      ),
    );
  }

  async createGuestUser(ttlDays: number) : Promise<string> {
    const doc: any = await this.client.query(q.Create(q.Collection("Users"), { 
      data: { isGuest: true }, 
      ttl: q.TimeAdd(q.Now(), ttlDays, 'days')
    }));
    return doc.ref.id;
  };

  async createUserToken(userId: string, ttlSec: number) : Promise<string> {
    const tokenDoc: any = await this.client.query(q.Create(q.Tokens(), { 
      instance: q.Ref(q.Collection("Users"), userId),
      ttl: q.TimeAdd(q.Now(), ttlSec, 'seconds')
    }));
    return tokenDoc.secret;
  };
}
