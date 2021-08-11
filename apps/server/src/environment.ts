export const IS_OFFLINE = process.env.IS_OFFLINE === 'true';

if(IS_OFFLINE){
  process.env.PUBLIC_FOLDER_PATH = 'src/public';
  process.env.TWITCH_REDIRECT_URI='http://localhost:8080/api/twitch/redirectFrom';
  process.env.HOME_PAGE_URL='http://localhost:8080';
}

export const REGION = process.env.REGION as string;
export const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL as string;
export const PUBLIC_FOLDER_PATH  = process.env.PUBLIC_FOLDER_PATH as string;
export const DOMAIN_NAME = process.env.DOMAIN_NAME as string;
export const HOME_PAGE_URL = process.env.HOME_PAGE_URL as string;
export const DOMAIN_CERTIFICATE_NAME = process.env.DOMAIN_CERTIFICATE_NAME as string;
export const FAUNADB_SECRET = process.env.FAUNADB_SECRET as string;
export const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID as string;
export const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET as string;
export const TWITCH_WEBHOOK_SECRET = process.env.TWITCH_WEBHOOK_SECRET as string;
export const TWITCH_WEBHOOK_CALLBACK = process.env.TWITCH_WEBHOOK_CALLBACK as string;
export const TWITCH_REDIRECT_URI = process.env.TWITCH_REDIRECT_URI as string;
export const TWITCH_TOKEN_ENCRYPTION_KEY = process.env.TWITCH_TOKEN_ENCRYPTION_KEY as string;
export const COOKIE_SIGNING_KEY = process.env.COOKIE_SIGNING_KEY as string;