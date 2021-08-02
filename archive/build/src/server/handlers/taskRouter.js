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
const DBClient_1 = __importDefault(require("../../common/DBClient"));
const Scheduler_1 = __importStar(require("../Scheduler"));
const TwitchClient_1 = __importDefault(require("../TwitchClient"));
const predictionHandlers_1 = require("./predictionHandlers");
const twitchHandlers_1 = require("./twitchHandlers");
const db = new DBClient_1.default(process.env.FAUNADB_SECRET);
const twitch = new TwitchClient_1.default(db);
const scheduler = new Scheduler_1.default();
const routingTable = {
    [Scheduler_1.TaskType.MonitorChannel]: (task) => twitchHandlers_1.handleTaskMonitorChannel(task.data, twitch),
    [Scheduler_1.TaskType.MonitorStreams]: (task) => twitchHandlers_1.handleTaskMonitorStreams(task, scheduler, db),
    [Scheduler_1.TaskType.GetRealTimeStreamMetrics]: (task) => twitchHandlers_1.handleTaskGetRealTimeStreamMetrics(task.data, twitch, db),
    [Scheduler_1.TaskType.PredictionEvent]: (task) => predictionHandlers_1.handleTaskPredictionEvent(task.data, db, scheduler),
    [Scheduler_1.TaskType.StreamEvent]: (task) => twitchHandlers_1.handleTaskStreamEvent(task.data, scheduler, db),
    [Scheduler_1.TaskType.CreatePrediction]: (task) => predictionHandlers_1.handleTaskCreatePrediction(task.data.channelId, db, twitch, scheduler),
};
exports.default = (event) => {
    let tasks = [];
    if (event.Records) {
        tasks = event.Records.map((r) => JSON.parse(r.body));
    }
    else {
        tasks = event;
    }
    return Promise.allSettled(tasks.map(async (task) => {
        try {
            await routingTable[task.type](task);
        }
        catch (e) {
            console.error(e);
        }
    }));
};
//# sourceMappingURL=taskRouter.js.map