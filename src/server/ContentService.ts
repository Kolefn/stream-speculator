import express from 'express';

const ContentService = express();
ContentService.use(express.static(process.env.PUBLIC_FOLDER_PATH as string));
export default ContentService;
