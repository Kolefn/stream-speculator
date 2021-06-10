import serverlessExpress from '@vendia/serverless-express';
import ExpressApp from './ExpressApp';

// eslint-disable-next-line import/prefer-default-export
export const serveFiles = serverlessExpress({ app: ExpressApp });
