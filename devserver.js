// eslint-disable-next-line import/no-extraneous-dependencies
const chokidar = require('chokidar');
const { promisify } = require('util');
const childProcess = require('child_process');

const exec = promisify(childProcess.exec);

process.env.PUBLIC_FOLDER_PATH = 'src/public';
process.env.VIEWS_FOLDER_PATH = 'src/views';

let clientBundling = false;
const clientWatcher = chokidar.watch('./src/client').on('all', async () => {
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
  // eslint-disable-next-line global-require
  const service = require('./build/server/ExpressApp').default;
  server = service.listen(8080);
  server.on('error', (err)=> console.error(err));
};

let serverCompiling = false;
const serverWatcher = chokidar.watch('./src/server').on('all', async () => {
  if (serverCompiling) { return; }
  serverCompiling = true;
  exec('npm run compile').then(() => {
    console.log('re-compiled. restarting server.');
    restartServer();
  }).catch((e) => console.error(e))
    .finally(() => { serverCompiling = false; });
});

restartServer();

process.on('beforeExit', async () => {
  server.close();
  await clientWatcher.close();
  await serverWatcher.close();
});
