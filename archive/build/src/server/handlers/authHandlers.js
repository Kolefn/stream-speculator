"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redirectFromTwitchLogin = exports.redirectToTwitchLogin = exports.login = exports.loginAsGuest = exports.getDBToken = void 0;
const crypto_1 = __importDefault(require("crypto"));
const twitch_auth_1 = require("twitch-auth");
const APIResponse_1 = __importDefault(require("../APIResponse"));
const Cookie_1 = __importDefault(require("../Cookie"));
const DBClient_1 = __importDefault(require("../../common/DBClient"));
const UnAuthorizedError_1 = __importDefault(require("../errors/UnAuthorizedError"));
const TwitchClient_1 = __importDefault(require("../TwitchClient"));
const NotFoundError_1 = __importDefault(require("../errors/NotFoundError"));
const GUEST_TTL_DAYS = 7;
const GUEST_TTL_MS = GUEST_TTL_DAYS * 86400 * 1000;
const USER_COOKIE_TTL_MS = 30 * 86400 * 1000;
const DB_TOKEN_TTL_SEC = 30 * 60;
const USER_INITIAL_COINS = 10000;
const getDBToken = async (session, db) => {
    if (session) {
        const { secret } = await db.exec(DBClient_1.default.token(DBClient_1.default.users.doc(session.userId), DBClient_1.default.fromNow(DB_TOKEN_TTL_SEC, 'seconds')));
        return { secret, expiresAt: Date.now() + DB_TOKEN_TTL_SEC * 1000 };
    }
    throw new UnAuthorizedError_1.default('GetDBToken');
};
exports.getDBToken = getDBToken;
const loginAsGuest = async (session, db) => {
    if (session) {
        const token = await exports.getDBToken(session, db);
        return new APIResponse_1.default({
            data: {
                userId: session.userId,
                dbToken: token,
            },
        });
    }
    const { user, token } = await db.exec(DBClient_1.default.named({
        user: DBClient_1.default.create(DBClient_1.default.users, { isGuest: true, coins: USER_INITIAL_COINS }, DBClient_1.default.fromNow(GUEST_TTL_DAYS, 'days')),
        token: DBClient_1.default.token(DBClient_1.default.varToRef('user'), DBClient_1.default.fromNow(DB_TOKEN_TTL_SEC, 'seconds')),
    }));
    const userId = user.ref.id;
    return new APIResponse_1.default({
        data: {
            userId,
            dbToken: {
                secret: token.secret,
                expiresAt: Date.now() + DB_TOKEN_TTL_SEC * 1000,
            },
        },
        cookies: [new Cookie_1.default('session', { userId, isGuest: true }, GUEST_TTL_MS)],
    });
};
exports.loginAsGuest = loginAsGuest;
const login = async (session, db, twitch) => {
    if (!session) {
        throw new UnAuthorizedError_1.default('login');
    }
    const dbToken = await exports.getDBToken(session, db);
    if (session.isGuest) {
        return {
            userId: session.userId,
            dbToken,
            isGuest: true,
        };
    }
    if (!session.twitchId) {
        throw new UnAuthorizedError_1.default('twitchId login');
    }
    const twitchUser = await twitch.api.helix.users.getUserById(session.twitchId);
    if (!twitchUser) {
        throw new NotFoundError_1.default('twitch login user');
    }
    return {
        userId: session.userId,
        displayName: twitchUser?.displayName,
        profileImageUrl: twitchUser?.profilePictureUrl,
        isGuest: false,
        dbToken,
    };
};
exports.login = login;
const redirectToTwitchLogin = async (session, referrer) => {
    const state = crypto_1.default.randomBytes(3).toString('hex');
    return new APIResponse_1.default({
        data: {},
        redirect: `https://id.twitch.tv/oauth2/authorize?client_id=${process.env.TWITCH_CLIENT_ID}&redirect_uri=${process.env.TWITCH_REDIRECT_URI}&response_type=code&state=${state}`,
        cookies: [
            new Cookie_1.default('session', {
                ...(session ?? {}),
                state,
                referrer,
            }, GUEST_TTL_MS),
        ],
    });
};
exports.redirectToTwitchLogin = redirectToTwitchLogin;
const redirectFromTwitchLogin = async (session, code, state, db) => {
    if (!session) {
        throw new UnAuthorizedError_1.default('Twitch OAuth without Session');
    }
    if (session.state !== state) {
        throw new UnAuthorizedError_1.default('Twitch OAuth State Mismatch');
    }
    const token = await twitch_auth_1.exchangeCode(process.env.TWITCH_CLIENT_ID, process.env.TWITCH_CLIENT_SECRET, code, process.env.TWITCH_REDIRECT_URI);
    const tokenInfo = await twitch_auth_1.getTokenInfo(token.accessToken, process.env.TWITCH_CLIENT_ID);
    const { user } = await db.exec(DBClient_1.default.named({
        existingUser: DBClient_1.default.getIfMatch(DBClient_1.default.users.with('twitchId', tokenInfo.userId)),
        user: DBClient_1.default.ifNull(DBClient_1.default.useVar('existingUser'), DBClient_1.default.create(DBClient_1.default.users, {
            id: session.userId,
            isGuest: false,
            coins: USER_INITIAL_COINS,
            _twitchId: tokenInfo.userId,
        }), DBClient_1.default.useVar('existingUser')),
    }));
    return new APIResponse_1.default({
        data: {},
        redirect: session.referrer ?? process.env.HOME_PAGE_URL,
        cookies: [
            new Cookie_1.default('session', {
                userId: user.ref.id,
                twitchId: tokenInfo.userId,
                twitchToken: TwitchClient_1.default.encryptToken(token),
                isGuest: false,
            }, USER_COOKIE_TTL_MS),
        ],
    });
};
exports.redirectFromTwitchLogin = redirectFromTwitchLogin;
//# sourceMappingURL=authHandlers.js.map