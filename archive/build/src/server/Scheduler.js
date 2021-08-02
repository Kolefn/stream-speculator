"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamMonitoringInitialTask = exports.TaskType = void 0;
const sqs_1 = __importDefault(require("aws-sdk/clients/sqs"));
const DBClient_1 = __importDefault(require("../common/DBClient"));
const db = new DBClient_1.default(process.env.FAUNADB_SECRET);
const MAX_DELAY_SECONDS = 60 * 15;
var TaskType;
(function (TaskType) {
    TaskType[TaskType["MonitorChannel"] = 0] = "MonitorChannel";
    TaskType[TaskType["MonitorStreams"] = 1] = "MonitorStreams";
    TaskType[TaskType["GetRealTimeStreamMetrics"] = 2] = "GetRealTimeStreamMetrics";
    TaskType[TaskType["StreamEvent"] = 4] = "StreamEvent";
    TaskType[TaskType["PredictionEvent"] = 3] = "PredictionEvent";
    TaskType[TaskType["CreatePrediction"] = 5] = "CreatePrediction";
})(TaskType = exports.TaskType || (exports.TaskType = {}));
exports.StreamMonitoringInitialTask = {
    type: TaskType.MonitorStreams,
    when: [{ at: { second: 25 } }, { at: { second: 55 } }],
    data: { streamsChanged: true },
    repeats: true,
};
const getDelaySeconds = (task) => {
    if (task.when && task.when.length > 0) {
        const now = new Date();
        return task.when.reduce((minDelay, w) => {
            if (typeof w.at?.second === 'number') {
                const sec = now.getSeconds() + (now.getMilliseconds() / 1000);
                const until = w.at?.second - sec;
                const delay = Math.floor(until < 0 ? until + 60 : until);
                return Math.min(minDelay, (task.isRepeat && delay === 0) ? 60 : delay);
            }
            if (typeof w.timestamp === 'number') {
                return Math.min(MAX_DELAY_SECONDS, minDelay, Math.round((w.timestamp - Date.now()) / 1000));
            }
            return minDelay;
        }, Infinity);
    }
    return 0;
};
const repeatingTaskQuery = (task) => DBClient_1.default.updateOrCreate(DBClient_1.default.scheduledTasks.doc(task.type.toString()), (task.data ?? {}));
const isInitial = (task) => Boolean(task.repeats && !task.isRepeat);
class Scheduler {
    constructor() {
        this.client = new sqs_1.default({
            region: process.env.REGION,
        });
    }
    static async end(task) {
        await db.exec(DBClient_1.default.deleteExists(DBClient_1.default.scheduledTasks.doc(task.type.toString())));
    }
    async schedule(task) {
        if (isInitial(task)) {
            const created = await db.exec(repeatingTaskQuery(task));
            if (!created) {
                return false;
            }
        }
        if (process.env.LOCAL) {
            setTimeout(() => Scheduler.localHandler(task), getDelaySeconds(task) * 1000);
            return true;
        }
        await this.client.sendMessage({
            QueueUrl: process.env.SQS_QUEUE_URL,
            MessageBody: JSON.stringify(task),
            DelaySeconds: getDelaySeconds(task),
        }).promise();
        return true;
    }
    async scheduleBatch(inTasks) {
        let tasks = inTasks;
        const initialTasks = tasks.filter((t) => isInitial(t));
        if (initialTasks.length > 0) {
            const didCreate = await db.exec(DBClient_1.default.named(initialTasks.reduce((map, task) => {
                if (!map[task.type]) {
                    map[task.type] = repeatingTaskQuery(task);
                }
                return map;
            }, {})));
            tasks = tasks.filter((t) => !isInitial(t) || didCreate[t.type]);
        }
        if (tasks.length === 0) {
            return;
        }
        if (process.env.LOCAL) {
            tasks.forEach((task) => {
                setTimeout(() => Scheduler.localHandler(task), getDelaySeconds(task) * 1000);
            });
        }
        else {
            await this.client.sendMessageBatch({
                QueueUrl: process.env.SQS_QUEUE_URL,
                Entries: tasks.map((task, i) => ({
                    Id: `${task.type}${i}`,
                    MessageBody: JSON.stringify(task),
                    DelaySeconds: getDelaySeconds(task),
                })),
            }).promise();
        }
    }
}
exports.default = Scheduler;
//# sourceMappingURL=Scheduler.js.map