"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class UnAuthorizedError extends Error {
    constructor(resource) {
        super(`Permission denied to ${resource}.`);
    }
}
exports.default = UnAuthorizedError;
//# sourceMappingURL=UnAuthorizedError.js.map