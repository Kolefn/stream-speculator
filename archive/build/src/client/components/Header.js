"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mobx_react_lite_1 = require("mobx-react-lite");
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const userStore_1 = require("../stores/userStore");
exports.default = mobx_react_lite_1.observer(() => {
    const userStore = userStore_1.useUserStore();
    return (react_1.default.createElement("div", { style: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between' } },
        react_1.default.createElement("h3", null,
            "\uD83D\uDCB0",
            userStore.coins),
        userStore.isGuest && (react_1.default.createElement("div", { style: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between' } },
            !userStore.loggedIn && react_1.default.createElement("button", { type: "button", onClick: () => userStore.loginAsGuest() }, "Guest"),
            react_1.default.createElement(react_router_dom_1.Link, { to: "/api/twitch/redirectTo" }, "Twitch")))));
});
//# sourceMappingURL=Header.js.map