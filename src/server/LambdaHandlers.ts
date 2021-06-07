import serverlessExpress from '@vendia/serverless-express';
import ContentService from './ExpressApp';

// eslint-disable-next-line import/prefer-default-export
export const serveFiles = serverlessExpress({ app: ContentService });
