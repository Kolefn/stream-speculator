import { AccessToken, ClientCredentialsAuthProvider, revokeToken } from 'twitch-auth';
import DBClient from './DBClient';

export default class TwitchAuthProvider extends ClientCredentialsAuthProvider {
  dbClient: DBClient;

  constructor(clientId: string, clientSecret: string, dbClient: DBClient) {
    super(clientId, clientSecret);
    this.dbClient = dbClient;
  }

  async refresh() : Promise<AccessToken> {
    try {
      return await this.dbClient.getTwitchClientAccessToken();
    } catch {
      const token = await super.refresh();
      try {
        await this.dbClient.storeTwitchClientAccessToken(token);
        return token;
      } catch (e) {
        await revokeToken(this.clientId, token.accessToken);
        throw e;
      }
    }
  }
}
