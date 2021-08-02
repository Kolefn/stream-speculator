export declare enum TaskType {
    MonitorChannel = 0,
    MonitorStreams = 1,
    GetRealTimeStreamMetrics = 2,
    StreamEvent = 4,
    PredictionEvent = 3,
    CreatePrediction = 5
}
export declare type ScheduledTask = {
    type: TaskType;
    data?: any;
    when?: {
        at?: {
            second: number;
        };
        timestamp?: number;
    }[];
    repeats?: boolean;
    isRepeat?: boolean;
};
export declare const StreamMonitoringInitialTask: ScheduledTask;
export default class Scheduler {
    static localHandler: (task: ScheduledTask) => Promise<void>;
    private client;
    constructor();
    static end(task: ScheduledTask): Promise<void>;
    schedule(task: ScheduledTask): Promise<boolean>;
    scheduleBatch(inTasks: ScheduledTask[]): Promise<void>;
}
//# sourceMappingURL=Scheduler.d.ts.map