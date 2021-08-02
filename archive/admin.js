require('dotenv').config({ path: './.env.dev' });
const TwitchClient = require('./build/src/server/TwitchClient').default;
const DBClient = require('./build/src/common/DBClient').default;
const db = new DBClient(process.env.FAUNADB_SECRET);
const twitch = new TwitchClient(db);
const deleteSubscriptions = async () => {
    await twitch.api.helix.eventSub.deleteAllSubscriptions();
};

deleteSubscriptions().catch((err)=> console.error(err));