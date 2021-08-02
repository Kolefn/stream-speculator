import crypto from 'crypto';
import { exchangeCode, getTokenInfo } from 'twitch-auth';
import { DBToken, LoginAsGuestResponse, LoginResponse } from '../../common/types';
import APIResponse from '../APIResponse';
import Cookie from '../Cookie';
import DB, { FaunaTokenDoc, FaunaDoc } from '../../common/DBClient';
import UnAuthorizedError from '../errors/UnAuthorizedError';
import TwitchClient from '../TwitchClient';
import NotFoundError from '../errors/NotFoundError';

const GUEST_TTL_DAYS = 7;
const GUEST_TTL_MS = GUEST_TTL_DAYS * 86400 * 1000;
const USER_COOKIE_TTL_MS = 30 * 86400 * 1000;
const DB_TOKEN_TTL_SEC = 30 * 60;
const USER_INITIAL_COINS = 10000;

export type AuthSession = {
  userId: string;
  twitchId: string;
  isGuest: boolean;
  twitchToken?: string;
  state?: string;
  referrer?: string;
};

export const getDBToken = async (session: AuthSession | null, db: DB) : Promise<DBToken> => {
  if (session) {
    const { secret } = await db.exec<FaunaTokenDoc>(DB.token(DB.users.doc(session.userId), DB.fromNow(DB_TOKEN_TTL_SEC, 'seconds')));
    return { secret, expiresAt: Date.now() + DB_TOKEN_TTL_SEC * 1000 };
  }
  throw new UnAuthorizedError('GetDBToken');
};

export const loginAsGuest = async (session: AuthSession | null, db: DB)
: Promise<APIResponse<LoginAsGuestResponse>> => {
  if (session) {
    const token = await getDBToken(session, db);
    return new APIResponse<LoginAsGuestResponse>({
      data: {
        userId: session.userId,
        dbToken: token,
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

export const login = async (session: AuthSession | null, db: DB, twitch: TwitchClient)
: Promise<LoginResponse> => {
  if (!session) {
    throw new UnAuthorizedError('login');
  }

  const dbToken = await getDBToken(session, db);

  if (session.isGuest) {
    return {
      userId: session.userId,
      dbToken,
      isGuest: true,
    };
  }

  if (!session.twitchId) {
    throw new UnAuthorizedError('twitchId login');
  }

  const twitchUser = await twitch.api.helix.users.getUserById(session.twitchId);

  if (!twitchUser) {
    throw new NotFoundError('twitch login user');
  }

  return {
    userId: session.userId,
    displayName: twitchUser?.displayName as string,
    profileImageUrl: twitchUser?.profilePictureUrl as string,
    isGuest: false,
    dbToken,
  };
};

export const redirectToTwitchLogin = async (session: AuthSession | null, referrer?: string)
: Promise<APIResponse<any>> => {
  const state = crypto.randomBytes(3).toString('hex');
  return new APIResponse<any>({
    data: {},
    redirect: `https://id.twitch.tv/oauth2/authorize?client_id=${process.env.TWITCH_CLIENT_ID}&redirect_uri=${process.env.TWITCH_REDIRECT_URI}&response_type=code&state=${state}`,
    cookies: [
      new Cookie(
        'session',
        {
          ...(session ?? {}),
          state,
          referrer,
        },
        GUEST_TTL_MS,
      ),
    ],
  });
};

export const redirectFromTwitchLogin = async (
  session: Partial<AuthSession> | null,
  code: string,
  state: string,
  db: DB,
) => {
  if (!session) {
    throw new UnAuthorizedError('Twitch OAuth without Session');
  }

  if (session.state !== state) {
    throw new UnAuthorizedError('Twitch OAuth State Mismatch');
  }

  const token = await exchangeCode(
    process.env.TWITCH_CLIENT_ID as string,
    process.env.TWITCH_CLIENT_SECRET as string,
    code,
    process.env.TWITCH_REDIRECT_URI as string,
  );

  const tokenInfo = await getTokenInfo(token.accessToken, process.env.TWITCH_CLIENT_ID as string);

  const { user } = await db.exec<{ user: FaunaDoc }>(
    DB.named({
      existingUser: DB.getIfMatch(
        DB.users.with('twitchId', tokenInfo.userId),
      ),
      user: DB.ifNull(
        DB.useVar('existingUser'),
        DB.create(
          DB.users,
          {
            id: session.userId,
            isGuest: false,
            coins: USER_INITIAL_COINS,
            _twitchId: tokenInfo.userId,
          },
        ),
        DB.useVar('existingUser'),
      ),
    }),
  );
  return new APIResponse<any>({
    data: {},
    redirect: session.referrer ?? process.env.HOME_PAGE_URL,
    cookies: [
      new Cookie(
        'session',
        {
          userId: user.ref.id,
          twitchId: tokenInfo.userId,
          twitchToken: TwitchClient.encryptToken(token),
          isGuest: false,
        },
        USER_COOKIE_TTL_MS,
      ),
    ],
  });
};
