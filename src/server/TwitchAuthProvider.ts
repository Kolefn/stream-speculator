import { AccessToken, ClientCredentialsAuthProvider, revokeToken } from 'twitch-auth';
import { default as DB, FaunaDoc } from '../common/DBClient';

type AccessTokenDocData = {
  accessToken: string;
  refreshToken: string;
  scope: string[];
};

export default class TwitchAuthProvider extends ClientCredentialsAuthProvider {
  dbClient: DB;

  constructor(clientId: string, clientSecret: string, dbClient: DB) {
    super(clientId, clientSecret);
    this.dbClient = dbClient;
  }

  async refresh() : Promise<AccessToken> {
    try {
      const doc = await this.dbClient.exec<FaunaDoc>(DB.get(DB.accessTokens.expireAfter(DB.fromNow(120, 'seconds'))));
      const data: AccessTokenDocData = doc.data;
      return new AccessToken({
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
        scope: data.scope,
        expires_in: (((doc.ttl ?? 0) / 1000) - Date.now()) / 1000
      });
    } catch {
      const token = await super.refresh();
      try {
        await this.dbClient.exec(DB.create<AccessTokenDocData>(DB.accessTokens, {
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          scope: token.scope,
        }, DB.fromDate(token.expiryDate as Date)));
        return token;
      } catch (e) {
        await revokeToken(this.clientId, token.accessToken);
        throw e;
      }
    }
  }
}
