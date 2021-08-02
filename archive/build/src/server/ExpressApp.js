"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_validator_1 = require("express-validator");
const APIResponse_1 = __importStar(require("./APIResponse"));
const TwitchClient_1 = __importDefault(require("./TwitchClient"));
const DBClient_1 = __importDefault(require("../common/DBClient"));
const Scheduler_1 = __importDefault(require("./Scheduler"));
const authHandlers_1 = require("./handlers/authHandlers");
const twitchHandlers_1 = require("./handlers/twitchHandlers");
const predictionHandlers_1 = require("./handlers/predictionHandlers");
const dbClient = new DBClient_1.default(process.env.FAUNADB_SECRET);
const twitch = new TwitchClient_1.default(dbClient);
const scheduler = new Scheduler_1.default();
const buildHandler = (responder, validators) => [
    ...(validators ?? []),
    async (req, res) => {
        try {
            const errors = express_validator_1.validationResult(req);
            if (!errors.isEmpty()) {
                APIResponse_1.default.send({ status: 400, data: { errors: errors.array() } }, res);
                return;
            }
            const response = await responder(req, res);
            if (response instanceof APIResponse_1.default) {
                response.send(res);
            }
            else {
                APIResponse_1.default.send({ data: response }, res);
            }
        }
        catch (e) {
            console.error(e);
            APIResponse_1.default.send({ status: APIResponse_1.APIResponseStatus.ServerError }, res);
        }
    },
];
const ExpressApp = express_1.default();
ExpressApp.use((req, _res, next) => {
    req.rawBody = req.body;
    next();
});
ExpressApp.use(express_1.default.json());
ExpressApp.use(cookie_parser_1.default(process.env.COOKIE_SIGNING_KEY));
ExpressApp.use((req, _res, next) => {
    try {
        req.session = JSON.parse(req.signedCookies.session);
    }
    catch {
        req.session = null;
    }
    next();
});
ExpressApp.get('/api/auth/dbToken', buildHandler((req) => authHandlers_1.getDBToken(req.session, dbClient)));
ExpressApp.post('/api/auth/loginAsGuest', buildHandler((req) => authHandlers_1.loginAsGuest(req.session, dbClient)));
ExpressApp.post('/api/auth/login', buildHandler((req) => authHandlers_1.login(req.session, dbClient, twitch)));
ExpressApp.get('/api/twitch/redirectTo', buildHandler((req) => authHandlers_1.redirectToTwitchLogin(req.session, req.headers.referer)));
ExpressApp.get('/api/twitch/redirectFrom', buildHandler((req) => authHandlers_1.redirectFromTwitchLogin(req.session, req.query.code, req.query.state, dbClient)));
ExpressApp.get('/api/twitch/:channelName', buildHandler((req) => twitchHandlers_1.getTwitchChannelPageData({
    db: dbClient,
    twitch,
    scheduler,
    channelName: req.params.channelName,
    session: req.session,
})));
ExpressApp.post('/api/twitch/webhook', buildHandler((req) => twitchHandlers_1.handleTwitchWebhook(req.headers, req.rawBody, { db: dbClient, scheduler, twitch })));
ExpressApp.post('/api/bet', buildHandler((req) => predictionHandlers_1.handleBet(req.session, req.body, dbClient)), predictionHandlers_1.betRequestValidator);
ExpressApp.use(express_1.default.static(process.env.PUBLIC_FOLDER_PATH));
ExpressApp.get('/twitch/:channelName', (_req, res) => {
    res.sendFile(path_1.default.resolve(process.cwd(), `${process.env.PUBLIC_FOLDER_PATH}/index.html`));
});
exports.default = ExpressApp;
//# sourceMappingURL=ExpressApp.js.map