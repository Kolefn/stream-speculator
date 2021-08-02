"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const faunadb_1 = __importStar(require("faunadb"));
class DBCollection {
    constructor(name) {
        this.name = name;
    }
    doc(id) {
        return faunadb_1.query.Ref(this.ref(), id);
    }
    ref() {
        return faunadb_1.query.Collection(this.name);
    }
    with(field, value) {
        return faunadb_1.query.Match(faunadb_1.query.Index(`${this.name}_by_${field}`), value);
    }
    withMulti(items) {
        const indexName = `${this.name}_by_${items.map((i) => i.field).join('_')}`;
        return faunadb_1.query.Match(faunadb_1.query.Index(indexName), ...items.map((i) => i.value));
    }
    withRefsTo(refs) {
        const fields = refs.map((ref) => {
            let field = ref.collection.name.toLowerCase();
            field = field.substring(0, field.length - 1);
            field = `${field}Ref`;
            return field;
        });
        const indexName = `${this.name}_by_${fields.join('_')}`;
        return faunadb_1.query.Match(faunadb_1.query.Index(indexName), ...refs.map((ref) => ref.collection.doc(ref.id)));
    }
    fieldExists(field) {
        return faunadb_1.query.Filter(faunadb_1.query.Documents(this.ref()), faunadb_1.query.Lambda('ref', faunadb_1.query.Not(faunadb_1.query.IsNull(faunadb_1.query.Select(['data', field], faunadb_1.query.Get(faunadb_1.query.Var('ref')))))));
    }
    expireAfter(time) {
        return faunadb_1.query.Filter(faunadb_1.query.Documents(this.ref()), faunadb_1.query.Lambda('ref', faunadb_1.query.GT(faunadb_1.query.Select(['ttl'], faunadb_1.query.Get(faunadb_1.query.Var('ref'))), time)));
    }
}
class DBClient {
    constructor(secret) {
        this.client = new faunadb_1.default.Client({
            secret,
        });
    }
    static collection(name) {
        return new DBCollection(name);
    }
    static named(shape) {
        const gets = {};
        const sets = {};
        Object.keys(shape).forEach((k) => {
            gets[k] = shape[k];
            sets[k] = faunadb_1.query.Var(k);
        });
        return faunadb_1.query.Let(gets, sets);
    }
    static useVar(varName) {
        return faunadb_1.query.Var(varName);
    }
    static defineVars(vars, usage) {
        return faunadb_1.query.Let(vars, usage);
    }
    static get(expr) {
        return faunadb_1.query.Get(expr);
    }
    static getIfMatch(expr) {
        return faunadb_1.query.Let({ list: expr }, faunadb_1.query.If(faunadb_1.query.IsEmpty(faunadb_1.query.Var('list')), null, faunadb_1.query.Get(faunadb_1.query.Var('list'))));
    }
    static getExists(expr) {
        return faunadb_1.query.Let({ ref: expr }, faunadb_1.query.If(faunadb_1.query.Exists(faunadb_1.query.Var('ref')), faunadb_1.query.Get(faunadb_1.query.Var('ref')), null));
    }
    static deRef(doc) {
        const data = {};
        Object.keys(doc.data).forEach((k) => {
            if (k.indexOf('Ref') > -1) {
                data[`${k.split('Ref')[0]}Id`] = doc.data[k].id;
            }
            else {
                data[k] = doc.data[k];
            }
        });
        return { id: doc.ref.id, ...data };
    }
    static deRefPage(page) {
        return page.data.map((doc) => this.deRef(doc));
    }
    static refify(data) {
        const docData = {};
        Object.keys(data).forEach((k) => {
            if (k.indexOf('Id') > -1 && k.charAt(0) !== '_') {
                const collectionSingular = k.split('Id')[0];
                let collectionPlural = `${collectionSingular}s`;
                collectionPlural = collectionPlural.charAt(0).toUpperCase() + collectionPlural.slice(1);
                docData[`${collectionSingular}Ref`] = faunadb_1.query.Ref(faunadb_1.query.Collection(collectionPlural), data[k]);
            }
            else if (k.charAt(0) === '_') {
                const s = k.slice(1);
                docData[s] = data[k];
            }
            else {
                docData[k] = data[k];
            }
        });
        return docData;
    }
    static deRefNamed(docs) {
        return Object.keys(docs).reduce((map, key) => {
            map[key] = this.deRef(docs[key]);
            return map;
        }, {});
    }
    static fromNow(offset, unit) {
        return faunadb_1.query.TimeAdd(faunadb_1.query.Now(), offset, unit);
    }
    static fromDate(date) {
        return faunadb_1.query.Time(date.toISOString());
    }
    static create(collection, data, ttl) {
        if (data.id) {
            const ref = collection.doc(data.id);
            return faunadb_1.query.If(faunadb_1.query.Exists(ref), { created: false, doc: faunadb_1.query.Get(ref) }, { created: true, doc: faunadb_1.query.Create(ref, { data: this.refify(data), ttl }) });
        }
        return faunadb_1.query.Create(collection.ref(), { data: this.refify(data), ttl });
    }
    static token(docRef, ttl) {
        return faunadb_1.query.Create(faunadb_1.query.Tokens(), { instance: docRef, ttl });
    }
    static batch(...exprs) {
        return faunadb_1.query.Do(...exprs);
    }
    static varToRef(varName) {
        return faunadb_1.query.Select(['ref'], faunadb_1.query.Var(varName));
    }
    static varSelect(varName, path, fallback) {
        return faunadb_1.query.Select(path, faunadb_1.query.Var(varName), fallback);
    }
    static getField(ref, fieldName) {
        return faunadb_1.query.Select(['data', fieldName], faunadb_1.query.Get(ref));
    }
    static add(a, b) {
        return faunadb_1.query.Add(a, b);
    }
    static count(set) {
        return faunadb_1.query.Count(set);
    }
    static merge(a, b) {
        return faunadb_1.query.Merge(a, b);
    }
    static delete(ref) {
        return faunadb_1.query.Delete(ref);
    }
    static deleteExists(ref) {
        return faunadb_1.query.If(faunadb_1.query.Exists(ref), faunadb_1.query.Delete(ref), null);
    }
    static update(ref, data) {
        return faunadb_1.query.Update(ref, { data });
    }
    static streamMetric(channelId, type) {
        return this.streamMetrics.doc(`${channelId}${type.toString()}`);
    }
    static updateOrCreate(ref, data) {
        const refified = this.refify(data);
        return faunadb_1.query.If(faunadb_1.query.Exists(ref), faunadb_1.query.Do(this.update(ref, refified), false), faunadb_1.query.Do(faunadb_1.query.Create(ref, { data: refified }), true));
    }
    static pageOfEvents(ref, maxAgeMs) {
        return faunadb_1.query.Map(faunadb_1.query.Paginate(ref, { events: true, after: faunadb_1.query.TimeSubtract(faunadb_1.query.Now(), maxAgeMs, 'milliseconds') }), faunadb_1.query.Lambda('doc', faunadb_1.query.Select(['data'], faunadb_1.query.Var('doc'))));
    }
    static updateUserCoins(userId, delta) {
        const ref = this.users.doc(userId);
        return faunadb_1.query.Update(ref, {
            data: {
                coins: faunadb_1.query.Add(faunadb_1.query.Select(['data', 'coins'], faunadb_1.query.Get(ref)), delta),
            },
        });
    }
    static addToDocFields(ref, adds) {
        const update = {};
        Object.keys(adds).forEach((key) => {
            update[key] = faunadb_1.query.Add(faunadb_1.query.Select(['data', key], faunadb_1.query.Var('fieldsDoc'), 0), adds[key]);
        });
        return faunadb_1.query.Let({
            fieldsDoc: faunadb_1.query.Get(ref),
        }, faunadb_1.query.Update(ref, {
            data: update,
        }));
    }
    static ifMultipleOf(value, of, ifTrue, ifFalse) {
        return faunadb_1.query.If(faunadb_1.query.And(faunadb_1.query.Not(faunadb_1.query.Equals(value, 0)), faunadb_1.query.Equals(faunadb_1.query.Modulo(value, of), 0)), ifTrue, ifFalse);
    }
    static userCoinPurchase(userId, cost, operation) {
        const ref = this.users.doc(userId);
        return faunadb_1.query.Let({
            coins: faunadb_1.query.Select(['data', 'coins'], faunadb_1.query.Get(ref)),
        }, faunadb_1.query.If(faunadb_1.query.GTE(faunadb_1.query.Var('coins'), cost), faunadb_1.query.Do(faunadb_1.query.Update(ref, { data: { coins: faunadb_1.query.Subtract(faunadb_1.query.Var('coins'), cost) } }), operation), null));
    }
    static ifFieldTrue(ref, field, trueExpr, falseExpr) {
        return faunadb_1.query.If(faunadb_1.query.And(faunadb_1.query.Exists(ref), faunadb_1.query.Equals(faunadb_1.query.Select(['data', field], faunadb_1.query.Get(ref)), true)), trueExpr, falseExpr);
    }
    static ifTrueSetFalse(ref, field) {
        return faunadb_1.query.If(faunadb_1.query.Equals(faunadb_1.query.Select(['data', field], faunadb_1.query.Get(ref)), true), faunadb_1.query.Do(faunadb_1.query.Update(ref, { data: { [field]: false } }), true), false);
    }
    static ifFieldGTE(ref, field, value, trueExpr, falseExpr) {
        return faunadb_1.query.If(faunadb_1.query.Exists(ref), faunadb_1.query.Let({
            fieldDoc: faunadb_1.query.Get(ref),
        }, faunadb_1.query.If(faunadb_1.query.GTE(faunadb_1.query.Select(['data', field], faunadb_1.query.Var('fieldDoc')), value), trueExpr, falseExpr)), null);
    }
    static ifEqual(a, b, trueExpr, falseExpr) {
        return faunadb_1.query.If(faunadb_1.query.Equals(a, b), trueExpr, falseExpr);
    }
    static ifNull(a, trueExpr, falseExpr) {
        return faunadb_1.query.If(faunadb_1.query.IsNull(a), trueExpr, falseExpr);
    }
    static firstPage(set, size) {
        return faunadb_1.query.Paginate(set, { size });
    }
    static getSortedResults(set) {
        return faunadb_1.query.Map(set, faunadb_1.query.Lambda(['field1', 'ref'], faunadb_1.query.Get(faunadb_1.query.Var('ref'))));
    }
    static getSortedRefs(set) {
        return faunadb_1.query.Map(set, faunadb_1.query.Lambda(['field1', 'ref'], faunadb_1.query.Var('ref')));
    }
    async exec(expr) {
        return this.client.query(expr);
    }
    onChange(ref, handler, options) {
        const stream = this.client.stream.document(ref);
        stream.on('version', (data) => {
            handler(data);
        });
        if (options?.includeSnapshot) {
            stream.on('snapshot', (data) => {
                handler({ document: data });
            });
        }
        stream.start();
        return () => stream.close();
    }
    async forEachPage(set, callback, options) {
        let page = { data: [] };
        do {
            const paginate = faunadb_1.query.Paginate(set, { after: page?.after, size: options?.size });
            page = await this.client.query(options?.getDocs
                ? faunadb_1.query.Map(paginate, faunadb_1.query.Lambda('pageDocRef', faunadb_1.query.Get(faunadb_1.query.Var('pageDocRef'))))
                : paginate);
            await callback(page);
        } while (page.after && page.data.length > 0);
    }
    async history(ref, maxAgeMs) {
        const page = await this.client.query(DBClient.pageOfEvents(ref, maxAgeMs));
        return page.data;
    }
}
exports.default = DBClient;
DBClient.channels = new DBCollection('Channels');
DBClient.users = new DBCollection('Users');
DBClient.scheduledTasks = new DBCollection('ScheduledTasks');
DBClient.accessTokens = new DBCollection('TwitchClientAccessTokens');
DBClient.streamMetrics = new DBCollection('StreamMetrics');
DBClient.webhookSubs = new DBCollection('TwitchWebhookSubs');
DBClient.predictions = new DBCollection('Predictions');
DBClient.bets = new DBCollection('Bets');
DBClient.outcomes = new DBCollection('Outcomes');
//# sourceMappingURL=DBClient.js.map