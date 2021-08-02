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
const react_1 = __importStar(require("react"));
const mobx_react_lite_1 = require("mobx-react-lite");
const usePageTitle_1 = __importDefault(require("../hooks/usePageTitle"));
const usePathnamePage_1 = __importDefault(require("../hooks/usePathnamePage"));
const Header_1 = __importDefault(require("../components/Header"));
const PredictionCard_1 = __importDefault(require("../components/PredictionCard"));
const channelStore_1 = require("../stores/channelStore");
const userStore_1 = require("../stores/userStore");
const TwitchChannelPage = mobx_react_lite_1.observer(() => {
    const channelName = usePathnamePage_1.default();
    usePageTitle_1.default(`${channelName} - Twitch`);
    const channelStore = channelStore_1.useChannelStore();
    const userStore = userStore_1.useUserStore();
    react_1.useEffect(() => {
        if (channelName && userStore.id) {
            channelStore.load(channelName);
        }
    }, [channelName, userStore.id]);
    react_1.useEffect(() => {
        if (userStore.dbClient && channelStore.channel) {
            const unsubMetric = channelStore.listenToMetrics(userStore.dbClient);
            const unsubPred = channelStore.listenToPredictions(userStore.dbClient);
            return () => {
                unsubMetric();
                unsubPred();
            };
        }
        return undefined;
    }, [userStore.dbClient, channelStore.channel]);
    return (react_1.default.createElement("div", null,
        react_1.default.createElement(Header_1.default, null),
        react_1.default.createElement("h1", null,
            channelName,
            ' - ',
            channelStore.channel?.isLive ? 'Live' : 'Offline'),
        react_1.default.createElement("h3", null,
            "Viewers:",
            channelStore.currentViewerCount),
        channelStore.predictions.map((p) => react_1.default.createElement(PredictionCard_1.default, { key: p.id, prediction: p }))));
});
exports.default = TwitchChannelPage;
//# sourceMappingURL=TwitchChannelPage.js.map