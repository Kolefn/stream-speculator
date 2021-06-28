import { TwitchChannelPageData, TwitchChannel } from "../../common/types";
import { default as DB, FaunaDocCreate } from "../../common/DBClient";
import NotFoundError from "../errors/NotFoundError";
import Scheduler, { TaskType } from "../Scheduler";
import TwitchClient from "../TwitchClient";

const dbClient = new DB(process.env.FAUNADB_SECRET as string);
const twitch = new TwitchClient(dbClient);
const scheduler = new Scheduler();

export const getTwitchChannelPageData = async (userName: string) : Promise<TwitchChannelPageData> => {
    userName = userName.toLowerCase();
    try {
        return DB.deRef<TwitchChannelPageData>(
            await dbClient.exec(
                DB.get(DB.channels.with('userName', userName))
            ),
        );
    } catch {
        const stream = await twitch.api.helix.streams.getStreamByUserName(userName);
        if(!stream){
            throw new NotFoundError(`${userName} TwitchStream`);
        }
        
        const result = await dbClient.exec<FaunaDocCreate>(
            DB.create<TwitchChannel>(DB.channels, { 
                id: stream.userId,
                displayName: stream.userDisplayName, 
                userName: stream.userName,
                stream: { 
                    id: stream.id,
                    startedAt: stream.startDate.getTime(),
                    viewerCount: stream.viewers,
                }
            })
        );
        
        if (result.created) {
            await scheduler.schedule({
                type: TaskType.MonitorChannel,
                data: { channelId: stream.userId },
            });
        }
          
        return DB.deRef<TwitchChannelPageData>(result.doc);
    }
};