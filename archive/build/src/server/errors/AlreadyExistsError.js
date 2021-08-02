"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AlreadyExistsError extends Error {
    constructor(resourceName) {
        super(`${resourceName} already exists.`);
    }
}
exports.default = AlreadyExistsError;
//# sourceMappingURL=AlreadyExistsError.js.map