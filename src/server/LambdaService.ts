import serverlessExpress from '@vendia/serverless-express';
import ContentService from './ContentService';

export default serverlessExpress({ app: ContentService });
