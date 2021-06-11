import serverlessExpress from '@vendia/serverless-express';
import ExpressApp from './ExpressApp';

export default serverlessExpress({ app: ExpressApp });
