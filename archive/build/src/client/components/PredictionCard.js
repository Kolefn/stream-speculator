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
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const endpoints_1 = require("../api/endpoints");
const OutcomeButton = (props) => {
    const { data, onClick } = props;
    return (react_1.default.createElement("button", { type: "button", style: { backgroundColor: data.color }, onClick: () => onClick(data.id) },
        react_1.default.createElement("p", null, data.title)));
};
exports.default = (props) => {
    const { prediction } = props;
    const onClick = react_1.useCallback((id) => endpoints_1.postBet({ outcomeId: id, predictionId: prediction.id, coins: 100 }), [prediction.id]);
    return (react_1.default.createElement("div", null,
        react_1.default.createElement("h2", null, prediction.title),
        Object.values(prediction.outcomes).map((outcome) => react_1.default.createElement(OutcomeButton, { key: outcome.id, data: outcome, onClick: onClick }))));
};
//# sourceMappingURL=PredictionCard.js.map