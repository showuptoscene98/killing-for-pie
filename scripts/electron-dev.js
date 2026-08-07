/**
 * Dev launcher: CRA (HOST=0.0.0.0) + Electron shell.
 * Coop relay is started by Electron main (same as packaged builds).
 */
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const root = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 3000);
const START_URL = process.env.ELECTRON_START_URL || `http://127.0.0.1:${PORT}`;

const env = {
  ...process.env,
  HOST: '0.0.0.0',
  BROWSER: 'none',
  PORT: String(PORT),
  ELECTRON_START_URL: START_URL,
  COOP_PORT: process.env.COOP_PORT || '27541',
};

const children = [];

function spawnChild(cmd, args, opts = {}) {
  const child = spawn(cmd, args, {
    cwd: root,
    env,
    stdio: 'inherit',
    shell: true,
    ...opts,
  });
  children.push(child);
  return child;
}

function shutdown(code = 0) {
  children.forEach((c) => {
    try {
      c.kill();
    } catch (_) {
      /* ignore */
    }
  });
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

function waitForUrl(url, tries = 120) {
  return new Promise((resolve, reject) => {
    let left = tries;
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        left -= 1;
        if (left <= 0) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(tick, 500);
      });
    };
    tick();
  });
}

const cra = spawnChild(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['react-scripts', 'start']
);

cra.on('exit', (code) => {
  if (code && code !== 0) shutdown(code);
});

waitForUrl(START_URL)
  .then(() => {
    console.log(`[electron-dev] CRA ready — launching Electron (${START_URL})`);
    const electronBin =
      process.platform === 'win32'
        ? path.join(root, 'node_modules', '.bin', 'electron.cmd')
        : path.join(root, 'node_modules', '.bin', 'electron');

    const electron = spawnChild(electronBin, ['.'], { shell: false });
    electron.on('exit', (code) => shutdown(code || 0));
  })
  .catch((err) => {
    console.error(err.message || err);
    shutdown(1);
  });
