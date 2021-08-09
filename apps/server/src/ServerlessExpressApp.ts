import serverless from 'serverless-http';
import ExpressApp from './ExpressApp';

export const handler = serverless(ExpressApp);
