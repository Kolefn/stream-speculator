import faunadb from 'faunadb';
import { StreamMetricType } from './types';
declare class DBCollection {
    readonly name: string;
    constructor(name: string);
    doc(id: string): faunadb.Expr;
    ref(): faunadb.Expr;
    with(field: string, value: any): faunadb.Expr;
    withMulti(items: {
        field: string;
        value: any;
    }[]): faunadb.Expr;
    withRefsTo(refs: {
        collection: DBCollection;
        id: string;
    }[]): faunadb.Expr;
    fieldExists(field: string): faunadb.Expr;
    expireAfter(time: faunadb.Expr): faunadb.Expr;
}
declare type FaunaCursor = object;
export declare type FaunaRef = {
    id: string;
};
export declare type FaunaDoc = {
    ref: FaunaRef;
    data: any;
    ttl?: number;
};
export declare type FaunaPage<T> = {
    after?: FaunaCursor;
    data: T[];
};
export declare type FaunaDocCreate = {
    created: boolean;
    doc: FaunaDoc;
};
export declare type FaunaTokenDoc = {
    ref: FaunaRef;
    instance: FaunaRef;
    ts: number;
    secret: string;
};
export declare type FaunaStreamData = {
    document: FaunaDoc;
    action?: 'update' | 'delete';
};
export declare type FaunaDocEvent<T> = {
    ts: number;
    action: string;
    document: FaunaRef;
    data: T;
};
export default class DBClient {
    static readonly channels: DBCollection;
    static readonly users: DBCollection;
    static readonly scheduledTasks: DBCollection;
    static readonly accessTokens: DBCollection;
    static readonly streamMetrics: DBCollection;
    static readonly webhookSubs: DBCollection;
    static readonly predictions: DBCollection;
    static readonly bets: DBCollection;
    static readonly outcomes: DBCollection;
    private client;
    constructor(secret: string);
    static collection(name: string): DBCollection;
    static named(shape: {
        [key: string]: faunadb.Expr;
    }): faunadb.Expr;
    static useVar(varName: string): faunadb.Expr;
    static defineVars(vars: {
        [key: string]: faunadb.ExprArg;
    }, usage: faunadb.Expr): faunadb.Expr;
    static get(expr: faunadb.Expr): faunadb.Expr;
    static getIfMatch(expr: faunadb.Expr): faunadb.Expr;
    static getExists(expr: faunadb.Expr): faunadb.Expr;
    static deRef<T>(doc: FaunaDoc): T;
    static deRefPage<T>(page: FaunaPage<FaunaDoc>): T[];
    static refify(data: {
        [key: string]: any;
    }): {
        [key: string]: any;
    };
    static deRefNamed<T>(docs: {
        [key: string]: FaunaDoc;
    }): T;
    static fromNow(offset: number, unit: 'days' | 'seconds' | 'hours'): faunadb.Expr;
    static fromDate(date: Date): faunadb.Expr;
    static create<T extends {
        [key: string]: any;
    }>(collection: DBCollection, data: T, ttl?: faunadb.Expr): faunadb.Expr;
    static token(docRef: faunadb.Expr, ttl: faunadb.Expr): faunadb.Expr;
    static batch(...exprs: faunadb.Expr[]): faunadb.Expr;
    static varToRef(varName: string): faunadb.Expr;
    static varSelect(varName: string, path: string[], fallback?: faunadb.ExprArg): faunadb.Expr;
    static getField(ref: faunadb.Expr, fieldName: string): faunadb.Expr;
    static add(a: faunadb.ExprArg, b: faunadb.ExprArg): faunadb.Expr;
    static count(set: faunadb.Expr): faunadb.Expr;
    static merge(a: faunadb.ExprArg, b: faunadb.ExprArg): faunadb.Expr;
    static delete(ref: faunadb.Expr): faunadb.Expr;
    static deleteExists(ref: faunadb.Expr): faunadb.Expr;
    static update(ref: faunadb.Expr, data: any): faunadb.Expr;
    static streamMetric(channelId: string, type: StreamMetricType): faunadb.Expr;
    static updateOrCreate(ref: faunadb.Expr, data: any): faunadb.Expr;
    static pageOfEvents(ref: faunadb.Expr, maxAgeMs: number): faunadb.Expr;
    static updateUserCoins(userId: string, delta: number): faunadb.Expr;
    static addToDocFields(ref: faunadb.Expr, adds: {
        [key: string]: faunadb.ExprArg;
    }): faunadb.Expr;
    static ifMultipleOf(value: faunadb.Expr, of: faunadb.ExprArg, ifTrue: faunadb.ExprArg | null, ifFalse: faunadb.ExprArg | null): faunadb.Expr;
    static userCoinPurchase(userId: string, cost: number, operation: faunadb.Expr): faunadb.Expr;
    static ifFieldTrue(ref: faunadb.Expr, field: string, trueExpr: faunadb.Expr, falseExpr: faunadb.Expr | null): faunadb.Expr;
    static ifTrueSetFalse(ref: faunadb.Expr, field: string): faunadb.Expr;
    static ifFieldGTE(ref: faunadb.Expr, field: string, value: faunadb.ExprArg, trueExpr: faunadb.Expr, falseExpr: faunadb.Expr | null): faunadb.Expr;
    static ifEqual(a: faunadb.ExprArg, b: faunadb.ExprArg, trueExpr: faunadb.ExprArg | null, falseExpr: faunadb.ExprArg | null): faunadb.Expr;
    static ifNull(a: faunadb.ExprArg, trueExpr: faunadb.ExprArg | null, falseExpr: faunadb.ExprArg | null): faunadb.Expr;
    static firstPage(set: faunadb.Expr, size?: number): faunadb.Expr;
    static getSortedResults(set: faunadb.Expr): faunadb.Expr;
    static getSortedRefs(set: faunadb.Expr): faunadb.Expr;
    exec<T>(expr: faunadb.Expr): Promise<T>;
    onChange(ref: faunadb.Expr, handler: (data: FaunaStreamData) => void, options?: {
        includeSnapshot?: boolean;
    }): Function;
    forEachPage<T>(set: faunadb.Expr, callback: (page: FaunaPage<T>) => Promise<void>, options?: {
        size?: number;
        getDocs?: boolean;
    }): Promise<void>;
    history<T>(ref: faunadb.Expr, maxAgeMs: number): Promise<T[]>;
}
export {};
//# sourceMappingURL=DBClient.d.ts.map