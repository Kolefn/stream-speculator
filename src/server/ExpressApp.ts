import express from 'express';

const ExpressApp = express();
ExpressApp.use(express.static(process.env.PUBLIC_FOLDER_PATH as string));
export default ExpressApp;
