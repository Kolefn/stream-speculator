"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useUserStore = exports.UserStoreContext = exports.UserStore = void 0;
const react_1 = require("react");
const mobx_1 = require("mobx");
const endpoints_1 = require("../api/endpoints");
const DBClient_1 = __importDefault(require("../../common/DBClient"));
class UserStore {
    constructor() {
        this.coins = 0;
        this.id = null;
        this.dbToken = null;
        this.loginError = null;
        this.isGuest = true;
        mobx_1.makeAutoObservable(this);
    }
    get loggedIn() {
        return this.id !== null;
    }
    get dbClient() {
        return this.dbToken ? new DBClient_1.default(this.dbToken.secret) : null;
    }
    async loginAsGuest() {
        endpoints_1.loginAsGuest().then((resp) => {
            mobx_1.runInAction(() => {
                this.id = resp.userId;
                this.dbToken = resp.dbToken;
                this.isGuest = true;
                this.profileImageUrl = '';
                this.displayName = '';
                this.loginError = null;
            });
        }).catch((e) => {
            mobx_1.runInAction(() => {
                this.loginError = e;
            });
        });
    }
    async autoLogin() {
        endpoints_1.login().then((resp) => {
            mobx_1.runInAction(() => {
                this.id = resp.userId;
                this.dbToken = resp.dbToken;
                this.displayName = resp.displayName;
                this.profileImageUrl = resp.profileImageUrl;
                this.isGuest = resp.isGuest;
                this.loginError = null;
            });
        }).catch((e) => {
            mobx_1.runInAction(() => {
                this.loginError = e;
            });
        });
    }
    listenToCoins() {
        if (!this.dbClient || !this.dbToken || !this.id) {
            return undefined;
        }
        return this.dbClient.onChange(DBClient_1.default.users.doc(this.id), (data) => {
            const user = data.document.data;
            mobx_1.runInAction(() => {
                this.coins = user.coins;
            });
        }, { includeSnapshot: true });
    }
}
exports.UserStore = UserStore;
exports.UserStoreContext = react_1.createContext({});
const useUserStore = () => react_1.useContext(exports.UserStoreContext);
exports.useUserStore = useUserStore;
//# sourceMappingURL=userStore.js.map