import { Response } from 'express';
export default class Cookie {
    name: string;
    data: any;
    ttlMs: number;
    constructor(name: string, data: any, ttlMs: number);
    addTo(res: Response): void;
}
//# sourceMappingURL=Cookie.d.ts.map