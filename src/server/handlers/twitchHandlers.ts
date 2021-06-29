import { TwitchChannelPageData, TwitchChannel } from "../../common/types";
import { default as DB, FaunaDocCreate } from "../../common/DBClient";
import NotFoundError from "../errors/NotFoundError";
import Scheduler, { StreamMonitoringTasks, TaskType } from "../Scheduler";
import TwitchClient from "../TwitchClient";
import APIResponse from "../APIResponse";
import { IncomingHttpHeaders } from "http";
import crypto from "crypto";
import { HelixEventSubSubscriptionStatus, HelixEventSubTransportData } from "twitch/lib";

const dbClient = new DB(process.env.FAUNADB_SECRET as string);
const twitch = new TwitchClient(dbClient);
const scheduler = new Scheduler();

interface EventSubSubscriptionBody {
	id: string;
	status: HelixEventSubSubscriptionStatus;
	type: string;
	version: string;
	condition: Record<string, string>;
	transport: HelixEventSubTransportData;
	created_at: string;
}

interface BaseEventSubBody {
	subscription: EventSubSubscriptionBody;
}

interface EventSubVerificationBody extends BaseEventSubBody {
	challenge: string;
}

interface EventSubNotificationBody extends BaseEventSubBody {
	event: { [key: string] : any };
}

export const getTwitchChannelPageData = async (userName: string) : Promise<TwitchChannelPageData> => {
    userName = userName.toLowerCase();
    try {
        return { 
            channel: DB.deRef<TwitchChannel>(
                await dbClient.exec(
                    DB.get(DB.channels.with('userName', userName))
                ),
            )
        };
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
                isLive: true,
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
          
        return { channel: DB.deRef<TwitchChannel>(result.doc) };
    }
};

export const handleTwitchWebhook = async (headers: IncomingHttpHeaders, rawBody: string) : Promise<APIResponse<any>> => {
    const messageId = headers['twitch-eventsub-message-id'] as string;
    const timestamp = headers['twitch-eventsub-message-timestamp'] as string;
    const algoSig = headers['twitch-eventsub-message-signature'] as string;
    const type = headers['twitch-eventsub-message-type'] as string;

    if(!type || !algoSig || !messageId || !timestamp){
        return new APIResponse({ status: 400 });
    }

    const [algorithm, signature] = algoSig.split('=', 2);

    if(crypto
			.createHmac(algorithm, process.env.TWITCH_WEBHOOK_SECRET as string)
			.update(messageId + timestamp + rawBody)
			.digest('hex') !== signature){
        
        return new APIResponse({ status: 401 });
    }

    const body = JSON.parse(rawBody);

    if(type === 'webhook_callback_verification'){
        const verificationBody = body as EventSubVerificationBody;
        await dbClient.exec(DB.create(DB.webhookSubs, 
            { 
                id: verificationBody.subscription.id, 
                type: verificationBody.subscription.type, 
                channelId: verificationBody.subscription.condition.broadcaster_user_id 
            }
        ));
        return new APIResponse({
            status: 200,
            data: verificationBody.challenge,
            contentType: 'plain/text',
        });
    }else if (type === 'notification'){
        const notificationBody = body as EventSubNotificationBody;
        const event = notificationBody.event;
        const eventType = notificationBody.subscription.type;
        const channelId = event.broadcaster_user_id;
        if(eventType === 'stream.online'){
            const update = { isLive: true, stream: { id: event.id, startedAt: new Date(event.started_at).getTime(), viewerCount: 0 }};
            await dbClient.exec(DB.update(DB.channels.doc(channelId),  update));
            await scheduler.scheduleBatch(StreamMonitoringTasks);
        }else if(eventType === 'stream.offline'){
            await dbClient.exec(DB.update(DB.channels.doc(channelId), { isLive: false }));
        }
        return new APIResponse({
            status: 200,
        });
    }

    return new APIResponse({ status: 200 });

};