"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useChannelStore = exports.ChannelStoreContext = exports.ChannelStore = void 0;
const react_1 = require("react");
const mobx_1 = require("mobx");
const DBClient_1 = __importDefault(require("../../common/DBClient"));
const endpoints_1 = require("../api/endpoints");
const types_1 = require("../../common/types");
const predictionUtils_1 = require("../../common/predictionUtils");
const updatePrediction = (prediction, update) => ({
    ...prediction,
    ...update,
    outcomes: update.outcomes ? Object.keys(prediction.outcomes).reduce((m, id) => {
        m[id] = {
            ...prediction.outcomes[id],
            ...(update.outcomes[id] ?? {}),
        };
        return m;
    }, {}) : prediction.outcomes,
});
class ChannelStore {
    constructor() {
        this.loadError = null;
        this.channel = null;
        this.viewerCount = [];
        this.predictions = [];
        mobx_1.makeAutoObservable(this);
    }
    get currentViewerCount() {
        return this.viewerCount.length > 0
            ? this.viewerCount[this.viewerCount.length - 1].value : 0;
    }
    async load(channelName) {
        try {
            const result = await endpoints_1.getTwitchChannelPageData(channelName);
            mobx_1.runInAction(() => {
                this.channel = result.channel;
                this.viewerCount = result.metrics?.viewerCount ?? this.viewerCount;
                this.predictions = result.predictions ?? this.predictions;
            });
        }
        catch (e) {
            mobx_1.runInAction(() => {
                this.loadError = e;
            });
        }
    }
    listenToMetrics(dbClient) {
        return dbClient?.onChange(DBClient_1.default.streamMetric(this.channel?.id ?? '', types_1.StreamMetricType.ViewerCount), (data) => {
            const metric = data.document.data;
            mobx_1.runInAction(() => {
                this.viewerCount = predictionUtils_1.fillPointGaps([...this.viewerCount, metric]);
            });
        }, { includeSnapshot: true });
    }
    listenToPredictions(dbClient) {
        return dbClient?.onChange(DBClient_1.default.channels.doc(this.channel?.id ?? ''), (data) => {
            const update = data.document.data.predictionUpdate;
            if (!update) {
                return;
            }
            mobx_1.runInAction(() => {
                const index = this.predictions.findIndex((p) => p.id === update.id);
                if (index > -1) {
                    this.predictions[index] = updatePrediction(this.predictions[index], update);
                }
                else {
                    this.predictions.unshift(update);
                }
            });
        }, { includeSnapshot: true });
    }
}
exports.ChannelStore = ChannelStore;
exports.ChannelStoreContext = react_1.createContext({});
const useChannelStore = () => react_1.useContext(exports.ChannelStoreContext);
exports.useChannelStore = useChannelStore;
//# sourceMappingURL=channelStore.js.map