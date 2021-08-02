"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class InsufficientFundsError extends Error {
    constructor(resourceName) {
        super(`Not enough coins for ${resourceName}.`);
    }
}
exports.default = InsufficientFundsError;
//# sourceMappingURL=InsufficientFundsError.js.map