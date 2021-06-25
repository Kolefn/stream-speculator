import faunadb, { query as q } from 'faunadb';

class DBCollection{

  constructor(public readonly name: string){}


  doc(id: string) : faunadb.Expr { 
    return q.Ref(this.ref(), id);
  }

  ref() : faunadb.Expr {
    return q.Collection(this.name);
  }

  with(field: string, value: any) : faunadb.Expr {
    return q.Match(q.Index(`${this.name}_by_${field}`), value);
  }

  by(collection: DBCollection, docVarKey: string) : faunadb.Expr {
    return q.Match(q.Index(`${this.name}_by_${collection.name}`), q.Select(["ref"], q.Var(docVarKey)));
  }

  fieldExists(field: string) : faunadb.Expr {
    return q.Filter(q.Documents(this.ref()), q.Lambda("ref", q.IsNull(q.Select(["data", field], q.Get(q.Var("ref"))))));
  }

}
type FaunaCursor = object;

export type FaunaRef = { id: string; };

export type FaunaDoc = {
  ref: FaunaRef;
  data: any;
};

export type FaunaPage<T> = {
  after?: FaunaCursor;
  data: T[];
};

export type FaunaDocCreate = {
  created: boolean;
  doc: FaunaDoc;
};

export type FaunaTokenDoc = {
  ref: FaunaRef;
  instance: FaunaRef;
  ts: number;
  secret: string;
}

export default class DBClient {
  static readonly channels: DBCollection = new DBCollection("Channels");
  static readonly users: DBCollection = new DBCollection("Users");
  static readonly scheduledTasks: DBCollection = new DBCollection("ScheduledTasks");
  static readonly accessTokens: DBCollection = new DBCollection("TwitchClientAccessTokens");
  static readonly streamMetrics: DBCollection = new DBCollection("StreamMetrics");

  private client: faunadb.Client;

  constructor() {
    this.client = new faunadb.Client({ secret: process.env.FAUNADB_SECRET as string });
  }

  static collection(name: string) : DBCollection{
    return new DBCollection(name);
  }

  static named(shape: { [key: string] : faunadb.Expr }) : faunadb.Expr {
    const gets: { [key: string] : faunadb.Expr } = {};
    const sets: { [key: string] : faunadb.Expr } = {};
    Object.keys(shape).forEach((k)=> {
      gets[k] = shape[k];
      sets[k] = q.Var(k);
    });
    return q.Let(gets, sets);
  }

  static get(expr: faunadb.Expr) : faunadb.Expr {
    return q.Get(expr);
  }

  static getIfMatch(expr: faunadb.Expr) :faunadb.Expr {
    return q.Let(
      { list: expr }, 
      q.If(
        q.IsEmpty(q.Var("list")),
        null,
        q.Get(q.Var("list")),
      ),
    );
  }

  static getExists(expr: faunadb.Expr) :faunadb.Expr {
    return q.Let(
      { ref: expr }, 
      q.If(
        q.Exists(q.Var("ref")),
        null,
        q.Get(q.Var("ref")),
      ),
    );
  }

  static deRef<T>(doc: FaunaDoc) : T {
    const data: any = {};
    Object.keys(doc.data).forEach((k)=> {
      if(k.indexOf("Ref") > -1){
        data[`${k.split("Ref")[0]}Id`] = doc.data[k].id;
      }else{
        data[k] = doc.data[k];
      }
    });
    return { id: doc.ref.id, ...data};
  };

  static refify(data: { [key: string]: any }) : { [key: string] : any } {
    const docData: any = {};
    Object.keys(data).forEach((k)=> {
      if(k.indexOf("Id") > -1){
        docData[`${k.split("Id")[0]}Ref`] = q.Ref(data[k]);
      }else{
        docData[k] = data[k];
      }
    });
    return docData;
  };

  static deRefNamed<T>(docs: { [key: string]: FaunaDoc }) : T {
      return Object.keys(docs).reduce((map: any, key)=> {
        map[key] = this.deRef(docs[key]);
        return map;
      }, {});
  }

  static ttl(offset: number, unit: 'days' | 'seconds') : faunadb.Expr {
    return q.TimeAdd(q.Now(), offset, unit);
  }

  static create<T extends { [key: string] : any }>(collection: DBCollection, data: T, ttl?: faunadb.Expr) : faunadb.Expr {
    if(data.id){
      const ref = collection.doc(data.id);
      return q.If(q.Exists(ref), { created: false, doc: q.Get(ref) }, { created: true, doc: q.Create(ref, { data: this.refify(data), ttl }) });
    }else{
      return q.Create(collection.ref(), { data: this.refify(data), ttl });
    }
  }

  static token(docRef: faunadb.Expr, ttl: faunadb.Expr) : faunadb.Expr {
    return q.Create(q.Tokens(), { instance: docRef, ttl });
  }

  static batch(...exprs: faunadb.Expr[]) : faunadb.Expr {
    return q.Do(...exprs);
  }

  static varToRef(varName: string) : faunadb.Expr {
    return q.Select(["ref"], q.Var(varName));
  }

  async exec<T>(expr: faunadb.Expr) : Promise<T>{
    return await this.client.query(expr);
  }


  async forEachPage<T>(set: faunadb.Expr, callback: (page: FaunaPage<T>) => Promise<void>, options?: { size?: number }) : Promise<void> {
    let page: FaunaPage<T> = { data: [] };
    do {
      page = await this.client.query(q.Paginate(set, { after: page?.after, ...(options ?? {})} )); 
      await callback(page);
    }while(page.after && page.data.length > 0);
  }


  // async storeTwitchClientAccessToken(token: AccessToken) : Promise<any> {
  //   const expiryDate = q.Time(token.expiryDate?.toISOString() as string);
  //   return this.client.query(q.Create(q.Collection('TwitchClientAccessTokens'), {
  //     ttl: expiryDate,
  //     data: {
  //       accessToken: token.accessToken,
  //       refreshToken: token.refreshToken,
  //       expiryTime: expiryDate,
  //       scope: token.scope,
  //     },
  //   }));
  // }

  // async getTwitchClientAccessToken(minMillisBeforeExpire: number = 120000) : Promise<AccessToken> {
  //   const result: any = await this.client.query(q.Select(['data'],
  //     q.Get(q.Filter(
  //       q.Documents(q.Collection('TwitchClientAccessTokens')),
  //       q.Lambda('documentRef', q.GTE(
  //         q.ToTime(q.Select(['data', 'expiryTime'], q.Get(q.Var('documentRef')))),
  //         q.Time(new Date(Date.now() + minMillisBeforeExpire).toISOString()),
  //       )),
  //     ))));

  //   return new AccessToken({
  //     access_token: result.accessToken,
  //     refresh_token: result.refreshToken,
  //     expires_in: (new Date(result.expiryTime).getTime() - Date.now()) / 1000,
  //     scope: result.scope,
  //   });
  // }

  // async getChannelAndStreamWithLogin(login: string) : Promise<ChannelAndStream> {
  //   const result = await this.client.query(
  //     q.Let({
  //       channelDoc: q.Get(q.Match(q.Index('Channels_by_login'), login)),
  //     }, q.Let({
  //       streamsByChannel: q.Match(q.Index('Streams_by_channelRef'), q.Select(['ref'], q.Var('channelDoc'))),
  //     }, {
  //       channel: q.Select(['data'], q.Var('channelDoc')),
  //       stream: q.If(q.IsEmpty(q.Var('streamsByChannel')), null, q.Select(['data'], q.Get(q.Var('streamsByChannel')))),
  //     })),
  //   );
  //   return result as ChannelAndStream;
  // }

  // async setChannelAndStream({ id, userId, userName, startDate,  viewers }: HelixStream) :
  // Promise<{ didCreate: boolean, data: ChannelAndStream }> {
  //   const channel = {
  //     id: userId,
  //     login: userName,
  //   };
  //   const stream = {
  //     channelRef: '',
  //     id,
  //     startedAt: startDate.getTime(),
  //     viewerCount: viewers,
  //   };
  //   const channelRef = q.Ref(q.Collection('Channels'), userId);
  //   const result = await this.client.query(
  //     q.If(
  //       q.Exists(channelRef),
  //       false,
  //       q.Do(
  //         q.Create(channelRef, { data: channel }),
  //         q.Create(q.Ref(q.Collection('Streams'), id), { data: { ...stream, channelRef } })
  //       ),
  //     ),
  //   );

  //   return { didCreate: Boolean(result), data: { channel, stream } };
  // }

  // async setIsMonitoringStreams() : Promise<boolean> {
  //   return Boolean(await this.client.query(
  //     q.If(
  //       q.IsEmpty(
  //         q.Match(q.Index('Metadata_by_flag'), 'isMonitoringStreams'),
  //       ),
  //       q.Create(q.Collection('Metadata'), { data: { flag: 'isMonitoringStreams' } }),
  //       false,
  //     ),
  //   ));
  // }

  // async forEachPageOfStreams(callback:
  // (docIdByChannelId: StreamDocIdByChannelId) => Promise<any>,
  // pageSize: number): Promise<void> {
  //   let page: any;
  //   do {
  //     // eslint-disable-next-line no-await-in-loop
  //     page = await this.client.query(
  //       q.Map(
  //         q.Paginate(q.Documents(q.Collection('Streams')), { size: pageSize, after: page?.after }),
  //         q.Lambda(
  //           'streamRef',
  //           {
  //             channelRef: q.Select(['data', 'channelRef'], q.Get(q.Var('streamRef'))),
  //             streamRef: q.Var('streamRef'),
  //           },
  //         ),
  //       ),
  //     );
  //     // eslint-disable-next-line no-await-in-loop
  //     await callback(
  //       page.data.reduce((mapping: StreamDocIdByChannelId, data: any) => {
  //         mapping[data.channelRef.id] = data.streamRef.id;
  //         return mapping;
  //       }, {}),
  //     );
  //   } while (page.after && page.data.length > 0);
  // }

  // async updateStreamViewerCounts(updatesByStreamDocId: { [streamDocId: string] : { viewerCount: number, timestamp: number } })
  //   : Promise<void> {
  //   await this.client.query(
  //     q.Map(
  //       Object.keys(updatesByStreamDocId).map((k)=> ({ docId: k, data: updatesByStreamDocId[k] })), 
  //       q.Lambda('doc', q.Update(
  //           q.Ref(q.Collection("Streams"), q.Select(["docId"], q.Var('doc'))),
  //           {
  //             data: q.Select(["data"], q.Var('doc'))
  //           }
  //         )
  //       )
  //     ),
  //   );
  // }

  // async createGuestUser(ttlDays: number) : Promise<string> {
  //   const doc: any = await this.client.query(q.Create(q.Collection("Users"), { 
  //     data: { isGuest: true }, 
  //     ttl: q.TimeAdd(q.Now(), ttlDays, 'days')
  //   }));
  //   return doc.ref.id;
  // };

  // async createUserToken(userId: string, ttlSec: number) : Promise<string> {
  //   const tokenDoc: any = await this.client.query(q.Create(q.Tokens(), { 
  //     instance: q.Ref(q.Collection("Users"), userId),
  //     ttl: q.TimeAdd(q.Now(), ttlSec, 'seconds')
  //   }));
  //   return tokenDoc.secret;
  // };
}
