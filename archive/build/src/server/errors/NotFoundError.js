"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class NotFoundError extends Error {
    constructor(resourceName) {
        super(`${resourceName} not found.`);
    }
}
exports.default = NotFoundError;
//# sourceMappingURL=NotFoundError.js.map