"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = async (method, path, body) => {
    const res = await fetch(path, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 200) {
        return (await res.json());
    }
    throw new Error(`${method} ${path} ${res.status} ${res.statusText}`);
};
//# sourceMappingURL=request.js.map