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
const mobx_react_lite_1 = require("mobx-react-lite");
const react_1 = __importStar(require("react"));
const react_dom_1 = __importDefault(require("react-dom"));
const react_router_dom_1 = require("react-router-dom");
const HomePage_1 = __importDefault(require("./pages/HomePage"));
const TwitchChannelPage_1 = __importDefault(require("./pages/TwitchChannelPage"));
const channelStore_1 = require("./stores/channelStore");
const userStore_1 = require("./stores/userStore");
const OnAppLoad = mobx_react_lite_1.observer(() => {
    const userStore = userStore_1.useUserStore();
    react_1.useEffect(() => {
        userStore.autoLogin();
    }, []);
    react_1.useEffect(() => {
        if (userStore.loggedIn) {
            const unsub = userStore.listenToCoins();
            return () => (unsub ? unsub() : null);
        }
        return undefined;
    }, [userStore.loggedIn]);
    return null;
});
const App = () => (react_1.default.createElement(react_router_dom_1.BrowserRouter, null,
    react_1.default.createElement(OnAppLoad, null),
    react_1.default.createElement(react_router_dom_1.Switch, null,
        react_1.default.createElement(react_router_dom_1.Route, { path: "/twitch/:channelName" },
            react_1.default.createElement(TwitchChannelPage_1.default, null)),
        react_1.default.createElement(react_router_dom_1.Route, { path: "/" },
            react_1.default.createElement(HomePage_1.default, null)))));
const AppWithContext = () => (react_1.default.createElement(userStore_1.UserStoreContext.Provider, { value: new userStore_1.UserStore() },
    react_1.default.createElement(channelStore_1.ChannelStoreContext.Provider, { value: new channelStore_1.ChannelStore() },
        react_1.default.createElement(App, null))));
react_dom_1.default.render(react_1.default.createElement(AppWithContext, null), document.getElementById('root'));
//# sourceMappingURL=index.js.map