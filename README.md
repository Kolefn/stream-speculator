## Stream Speculator

### Automated Twitch Predictions with cross-channel points.

I worked on this project to learn FaunaDB and to exercise serverless application development.

## Setup

1. create a FaunaDB database and initialize it with the commands at `apps/server/faunadb.txt`
2. register an app with the Twitch API
3. (optional) register a domain with AWS and create a SSL certificate with AWS CM.
4. populate a `.env.dev` or `.env` file in `apps/server` according to the following template:
   ```
   DOMAIN_NAME=example.com
   HOME_PAGE_URL=example.com
   DOMAIN_CERTIFICATE_NAME=example.com
   FAUNADB_SECRET=xxxxxxx
   TWITCH_CLIENT_ID=xxxxxxx
   TWITCH_CLIENT_SECRET=xxxxxxx
   TWITCH_WEBHOOK_SECRET=xxxxxxxxx
   TWITCH_WEBHOOK_CALLBACK=https://example.com/api/twitch/webhook
   TWITCH_REDIRECT_URI=https://example.com/api/twitch/redirectFrom
   TWITCH_TOKEN_ENCRYPTION_KEY=xxxxxxxxxxxx
   COOKIE_SIGNING_KEY=xxxxxxxxxxxxxxxxxx
   ```
5. run `npm run serverless login` to setup the Serverless Framework CLI with AWS account credentials
6. build the client with `npm run client:build:prod`
7. deploy `npm run server:deploy:dev` or run locally with `npm run server:local`
8. remove deployment with `npm run server:remove:dev`
