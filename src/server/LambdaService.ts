import serverlessExpress from '@vendia/serverless-express';
import ContentService from './ContentService';

// eslint-disable-next-line import/prefer-default-export
export const serveFiles = serverlessExpress({ app: ContentService });
