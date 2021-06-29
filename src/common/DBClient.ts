/* eslint-disable max-classes-per-file */
import faunadb, { query as q } from 'faunadb';

class DBCollection {
  constructor(public readonly name: string) {}

  doc(id: string) : faunadb.Expr {
    return q.Ref(this.ref(), id);
  }

  ref() : faunadb.Expr {
    return q.Collection(this.name);
  }

  with(field: string, value: any) : faunadb.Expr {
    return q.Match(q.Index(`${this.name}_by_${field}`), value);
  }

  withRefTo(collection: DBCollection, id: string) : faunadb.Expr {
    let field = collection.name.toLowerCase();
    field = field.substring(0, field.length - 1);
    field = `${field}Ref`;
    return this.with(field, id);
  }

  fieldExists(field: string) : faunadb.Expr {
    return q.Filter(q.Documents(this.ref()), q.Lambda('ref', q.Not(q.IsNull(q.Select(['data', field], q.Get(q.Var('ref')))))));
  }

  expireAfter(time: faunadb.Expr) : faunadb.Expr {
    return q.Filter(
      q.Documents(this.ref()),
      q.Lambda('ref',
        q.GT(
          q.Select(['ttl'], q.Get(q.Var('ref'))),
          time,
        )),
    );
  }
}
type FaunaCursor = object;

export type FaunaRef = { id: string; };

export type FaunaDoc = {
  ref: FaunaRef;
  data: any;
  ttl?: number;
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
};

export type FaunaStreamData = {
  document: FaunaDoc;
};

export default class DBClient {
  static readonly channels: DBCollection = new DBCollection('Channels');

  static readonly users: DBCollection = new DBCollection('Users');

  static readonly scheduledTasks: DBCollection = new DBCollection('ScheduledTasks');

  static readonly accessTokens: DBCollection = new DBCollection('TwitchClientAccessTokens');

  static readonly streamMetrics: DBCollection = new DBCollection('StreamMetrics');

  static readonly webhookSubs: DBCollection = new DBCollection('TwitchWebhookSubs');

  private client: faunadb.Client;

  constructor(secret: string) {
    this.client = new faunadb.Client({ secret });
  }

  static collection(name: string) : DBCollection {
    return new DBCollection(name);
  }

  static named(shape: { [key: string] : faunadb.Expr }) : faunadb.Expr {
    const gets: { [key: string] : faunadb.Expr } = {};
    const sets: { [key: string] : faunadb.Expr } = {};
    Object.keys(shape).forEach((k) => {
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
        q.IsEmpty(q.Var('list')),
        null,
        q.Get(q.Var('list')),
      ),
    );
  }

  static getExists(expr: faunadb.Expr) :faunadb.Expr {
    return q.Let(
      { ref: expr },
      q.If(
        q.Exists(q.Var('ref')),
        null,
        q.Get(q.Var('ref')),
      ),
    );
  }

  static deRef<T>(doc: FaunaDoc) : T {
    const data: any = {};
    Object.keys(doc.data).forEach((k) => {
      if (k.indexOf('Ref') > -1) {
        data[`${k.split('Ref')[0]}Id`] = doc.data[k].id;
      } else {
        data[k] = doc.data[k];
      }
    });
    return { id: doc.ref.id, ...data };
  }

  static refify(data: { [key: string]: any }) : { [key: string] : any } {
    const docData: any = {};
    Object.keys(data).forEach((k) => {
      if (k.indexOf('Id') > -1) {
        const collectionSingular = k.split('Id')[0];
        let collectionPlural = `${collectionSingular}s`;
        collectionPlural = collectionPlural.charAt(0).toUpperCase() + collectionPlural.slice(1);
        docData[`${collectionSingular}Ref`] = q.Ref(q.Collection(collectionPlural), data[k]);
      } else {
        docData[k] = data[k];
      }
    });
    return docData;
  }

  static deRefNamed<T>(docs: { [key: string]: FaunaDoc }) : T {
    return Object.keys(docs).reduce((map: any, key) => {
      // eslint-disable-next-line no-param-reassign
      map[key] = this.deRef(docs[key]);
      return map;
    }, {});
  }

  static fromNow(offset: number, unit: 'days' | 'seconds') : faunadb.Expr {
    return q.TimeAdd(q.Now(), offset, unit);
  }

  static fromDate(date: Date) : faunadb.Expr {
    return q.Time(date.toISOString());
  }

  static create<T extends { [key: string] : any }>(collection: DBCollection,
    data: T, ttl?: faunadb.Expr) : faunadb.Expr {
    if (data.id) {
      const ref = collection.doc(data.id);
      return q.If(q.Exists(ref),
        { created: false, doc: q.Get(ref) },
        { created: true, doc: q.Create(ref, { data: this.refify(data), ttl }) });
    }
    return q.Create(collection.ref(), { data: this.refify(data), ttl });
  }

  static token(docRef: faunadb.Expr, ttl: faunadb.Expr) : faunadb.Expr {
    return q.Create(q.Tokens(), { instance: docRef, ttl });
  }

  static batch(...exprs: faunadb.Expr[]) : faunadb.Expr {
    return q.Do(...exprs);
  }

  static varToRef(varName: string) : faunadb.Expr {
    return q.Select(['ref'], q.Var(varName));
  }

  static delete(ref: faunadb.Expr) : faunadb.Expr {
    return q.Delete(ref);
  }

  static deleteExists(ref:faunadb.Expr) : faunadb.Expr {
    return q.If(q.Exists(ref), q.Delete(ref), null);
  }

  static update(ref: faunadb.Expr, data: any) : faunadb.Expr {
    return q.Update(ref, { data });
  }

  async exec<T>(expr: faunadb.Expr) : Promise<T> {
    return this.client.query(expr);
  }

  onChange(ref: faunadb.Expr, handler: (data: FaunaStreamData)=> void) : Function {
    const stream = this.client.stream.document(ref);
    stream.on('version', (data) => {
      handler(data as FaunaStreamData);
    });
    stream.start();
    return () => stream.close();
  }

  async forEachPage<T>(set: faunadb.Expr, callback: (page: FaunaPage<T>) =>
  Promise<void>, options?: { size?: number }) : Promise<void> {
    let page: FaunaPage<T> = { data: [] };
    do {
      // eslint-disable-next-line no-await-in-loop
      page = await this.client.query(
        q.Paginate(set, { after: page?.after, ...(options ?? {}) }),
      );
      // eslint-disable-next-line no-await-in-loop
      await callback(page);
    } while (page.after && page.data.length > 0);
  }
}
