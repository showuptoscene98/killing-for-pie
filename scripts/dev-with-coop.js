/**
 * Dev launcher: LAN-friendly CRA (HOST=0.0.0.0) + private-IP coop relay.
 */
const { spawn } = require('child_process');
const path = require('path');

const env = {
  ...process.env,
  HOST: '0.0.0.0',
  BROWSER: process.env.BROWSER || 'none',
  COOP_PORT: process.env.COOP_PORT || '27541',
};

const root = path.join(__dirname, '..');

const relay = spawn(process.execPath, [path.join(__dirname, 'coop-server.js')], {
  cwd: root,
  env,
  stdio: 'inherit',
});

const cra = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['react-scripts', 'start'],
  {
    cwd: root,
    env,
    stdio: 'inherit',
    shell: true,
  }
);

function shutdown() {
  try {
    relay.kill();
  } catch (_) {
    /* ignore */
  }
  try {
    cra.kill();
  } catch (_) {
    /* ignore */
  }
  process.exit();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
relay.on('exit', (code) => {
  if (code && code !== 0) console.error('Coop relay exited', code);
});
cra.on('exit', (code) => {
  try {
    relay.kill();
  } catch (_) {
    /* ignore */
  }
  process.exit(code || 0);
});
