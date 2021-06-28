import { Response } from "express";

export default class Cookie {
    name: string;
    data: any;
    ttlMs: number;
    constructor(name: string, data: any, ttlMs: number){
        this.name = name;
        this.data = data;
        this.ttlMs = ttlMs;
    }
    
    addTo(res: Response){
        res.cookie(this.name, JSON.stringify(this.data), {
            httpOnly: true,
            expires: new Date(Date.now() + this.ttlMs),
            secure: Boolean(!process.env.LOCAL),
            sameSite: 'lax',
            domain: process.env.LOCAL ? undefined : process.env.DOMAIN_NAME,
            signed: true,
        });
    }
}