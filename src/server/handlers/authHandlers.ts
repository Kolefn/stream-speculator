import { DBToken, LoginAsGuestResponse } from '../../common/types';
import APIResponse from '../APIResponse';
import Cookie from '../Cookie';
import DB, { FaunaTokenDoc, FaunaDoc } from '../../common/DBClient';
import UnAuthorizedError from '../errors/UnAuthorizedError';

const db = new DB(process.env.FAUNADB_SECRET as string);

const GUEST_TTL_DAYS = 7;
const GUEST_TTL_MS = GUEST_TTL_DAYS * 86400 * 1000;
const DB_TOKEN_TTL_SEC = 30 * 60;
const USER_INITIAL_COINS = 10000;

export type AuthSession = {
  userId: string;
  isGuest: boolean;
};

export const getDBToken = async (session: AuthSession | null) : Promise<DBToken> => {
  if (session) {
    const { secret } = await db.exec<FaunaTokenDoc>(DB.token(DB.users.doc(session.userId), DB.fromNow(DB_TOKEN_TTL_SEC, 'seconds')));
    return { secret, expiresAt: Date.now() + DB_TOKEN_TTL_SEC * 1000 };
  }
  throw new UnAuthorizedError('GetDBToken');
};

export const loginAsGuest = async (session: AuthSession | null)
: Promise<APIResponse<LoginAsGuestResponse>> => {
  if (session) {
    const token = await getDBToken(session);
    return new APIResponse<LoginAsGuestResponse>({
      data: {
        userId: session.userId,
        dbToken: {
          secret: token.secret,
          expiresAt: Date.now() + DB_TOKEN_TTL_SEC * 1000,
        },
      },
    });
  }
  const { user, token } = await db.exec<{ user: FaunaDoc, token: FaunaTokenDoc }>(
    DB.named({
      user: DB.create(DB.users, { isGuest: true, coins: USER_INITIAL_COINS }, DB.fromNow(GUEST_TTL_DAYS, 'days')),
      token: DB.token(DB.varToRef('user'), DB.fromNow(DB_TOKEN_TTL_SEC, 'seconds')),
    }),
  );
  const userId = user.ref.id;
  return new APIResponse<LoginAsGuestResponse>({
    data: {
      userId,
      dbToken: {
        secret: token.secret,
        expiresAt: Date.now() + DB_TOKEN_TTL_SEC * 1000,
      },
    },
    cookies: [new Cookie('session', { userId, isGuest: true }, GUEST_TTL_MS)],
  });
};
