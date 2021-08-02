"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RedundantRequestError extends Error {
    constructor(resource) {
        super(`Request to ${resource} is redundant.`);
    }
}
exports.default = RedundantRequestError;
//# sourceMappingURL=RedundantRequestError.js.map