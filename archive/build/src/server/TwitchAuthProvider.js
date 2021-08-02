"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const twitch_auth_1 = require("twitch-auth");
const DBClient_1 = __importDefault(require("../common/DBClient"));
class TwitchAuthProvider extends twitch_auth_1.ClientCredentialsAuthProvider {
    constructor(clientId, clientSecret, dbClient) {
        super(clientId, clientSecret);
        this.dbClient = dbClient;
    }
    async refresh() {
        try {
            const doc = await this.dbClient.exec(DBClient_1.default.get(DBClient_1.default.accessTokens.expireAfter(DBClient_1.default.fromNow(120, 'seconds'))));
            const { data } = doc;
            return new twitch_auth_1.AccessToken({
                access_token: data.accessToken,
                refresh_token: data.refreshToken,
                scope: data.scope,
                expires_in: (((doc.ttl ?? 0) / 1000) - Date.now()) / 1000,
            });
        }
        catch {
            const token = await super.refresh();
            try {
                await this.dbClient.exec(DBClient_1.default.create(DBClient_1.default.accessTokens, {
                    accessToken: token.accessToken,
                    refreshToken: token.refreshToken,
                    scope: token.scope,
                }, DBClient_1.default.fromDate(token.expiryDate)));
                return token;
            }
            catch (e) {
                await twitch_auth_1.revokeToken(this.clientId, token.accessToken);
                throw e;
            }
        }
    }
}
exports.default = TwitchAuthProvider;
//# sourceMappingURL=TwitchAuthProvider.js.map