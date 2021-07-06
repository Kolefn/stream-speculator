// eslint-disable-next-line import/no-extraneous-dependencies
require('dotenv').config({ path: './.env.dev' });
const chokidar = require('chokidar');
const { promisify } = require('util');
const childProcess = require('child_process');

const exec = promisify(childProcess.exec);

process.env.PUBLIC_FOLDER_PATH = 'src/public';
process.env.LOCAL = 'true';


let clientBundling = false;
const clientWatcher = chokidar.watch('./src').on('all', async () => {
  if (clientBundling) { return; }
  clientBundling = true;
  exec('npm run bundle:dev').then(() => {
    console.log('client re-bundled. Refresh.');
  }).catch((e) => {
    console.error(e);
  }).finally(() => { clientBundling = false; });
});

let server;

const restartServer = () => {
  if (server) {
    server.close();
  }
  const Scheduler = require('./build/src/server/Scheduler').default;
  const ScheduledTaskHandler = require('./build/src/server/handlers/scheduledTaskHandler').default;
  Scheduler.localHandler = (task)=> ScheduledTaskHandler([task]);
  const service = require('./build/src/server/ExpressApp').default;
  server = service.listen(8080);
  server.on('error', (err)=> console.error(err));
};

// let serverCompiling = false;
// const serverWatcher = chokidar.watch('./src/server').on('all', async () => {
//   if (serverCompiling) { return; }
//   serverCompiling = true;
//   exec('npm run compile').then(() => {
//     console.log('re-compiled. restarting server.');
//     restartServer();
//   }).catch((e) => console.error(e))
//     .finally(() => { serverCompiling = false; });
// });

restartServer();

process.on('beforeExit', async () => {
  server.close();
  await clientWatcher.close();
  //await serverWatcher.close();
});
