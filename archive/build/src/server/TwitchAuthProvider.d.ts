import { AccessToken, ClientCredentialsAuthProvider } from 'twitch-auth';
import DB from '../common/DBClient';
export default class TwitchAuthProvider extends ClientCredentialsAuthProvider {
    dbClient: DB;
    constructor(clientId: string, clientSecret: string, dbClient: DB);
    refresh(): Promise<AccessToken>;
}
//# sourceMappingURL=TwitchAuthProvider.d.ts.map