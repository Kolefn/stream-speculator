"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Cookie {
    constructor(name, data, ttlMs) {
        this.name = name;
        this.data = data;
        this.ttlMs = ttlMs;
    }
    addTo(res) {
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
exports.default = Cookie;
//# sourceMappingURL=Cookie.js.map