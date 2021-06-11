import faunadb, { query as q } from 'faunadb';

type Channel = {
  id: string;
  login: string;
};

type LiveStream = {
  channelRef: string;
  startedAt: number;
};

type ChannelAndStream = {
  channel: Channel;
  stream?: LiveStream;
};

export default class DBClient {
  client: faunadb.Client;

  constructor() {
    this.client = new faunadb.Client({ secret: process.env.FAUNADB_SECRET as string });
  }

  async getChannelAndStreamWithLogin(login: string) : Promise<ChannelAndStream> {
    const result = await this.client.query(
      q.Let({
        channelDoc: q.Get(q.Match(q.Index('Channels_by_login'), login)),
      }, q.Let({
        streamMatch: q.Match(q.Index('Streams_by_channelRef'), q.Select(['ref'], q.Var('channelDoc'))),
      }, {
        channel: q.Select(['data'], q.Var('channelDoc')),
        stream: q.If(q.IsEmpty(q.Var('streamMatch')), null, q.Select(['data'], q.Get(q.Var('streamMatch')))),
      })),
    );
    return result as ChannelAndStream;
  }
}
