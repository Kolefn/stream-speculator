import cookie from "cookie";
import signer from "cookie-signature";

export default class Cookie {
    name: string;
    data: any;
    ttlMs: number;
    constructor(name: string, data: any, ttlMs: number){
        this.name = name;
        this.data = data;
        this.ttlMs = ttlMs;
    }

    addToResponse(res: any) {
        res.setHeader("Set-Cookie", this.serialize());
    }

    serialize(){
        return cookie.serialize(this.name, 
            signer.sign(JSON.stringify(this.data), process.env.COOKIE_SIGNING_KEY as string), { 
            httpOnly: true, 
            expires: new Date(Date.now() + this.ttlMs),
            secure: Boolean(!process.env.LOCAL),
            sameSite: 'lax',
            domain: process.env.LOCAL ? undefined : process.env.DOMAIN_NAME
        });
    }
}