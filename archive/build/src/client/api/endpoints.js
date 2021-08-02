"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postBet = exports.getTwitchChannelPageData = exports.getDBToken = exports.loginAsGuest = exports.login = void 0;
const request_1 = __importDefault(require("./request"));
const login = () => request_1.default('POST', '/api/auth/login');
exports.login = login;
const loginAsGuest = () => request_1.default('POST', '/api/auth/loginAsGuest');
exports.loginAsGuest = loginAsGuest;
const getDBToken = () => request_1.default('GET', '/api/auth/dbToken');
exports.getDBToken = getDBToken;
const getTwitchChannelPageData = (channelName) => request_1.default('GET', `/api/twitch/${channelName}`);
exports.getTwitchChannelPageData = getTwitchChannelPageData;
const postBet = (data) => request_1.default('POST', '/api/bet', data);
exports.postBet = postBet;
//# sourceMappingURL=endpoints.js.map