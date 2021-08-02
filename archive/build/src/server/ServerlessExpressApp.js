"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const serverless_express_1 = __importDefault(require("@vendia/serverless-express"));
const ExpressApp_1 = __importDefault(require("./ExpressApp"));
exports.default = serverless_express_1.default({ app: ExpressApp_1.default });
//# sourceMappingURL=ServerlessExpressApp.js.map