// Run this in the embedded Android Node process, not just an adb shell.
// No credentials or model requests are needed. Host success does not certify Android.
import { mkdtempSync, writeFileSync, readFileSync, rmSync, watch } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';

const results = [];
const workspace = mkdtempSync(path.join(tmpdir(), 'opencode-probe-'));
async function check(name, fn) {
  try { results.push({ name, ok: true, detail: await fn() }); }
  catch (error) { results.push({ name, ok: false, detail: error.message }); }
}
try {
  await check('files', () => {
    const filename = path.join(workspace, '你好.txt');
    writeFileSync(filename, 'OpenCode Android\n');
    if (readFileSync(filename, 'utf8') !== 'OpenCode Android\n') throw Error('Read/write mismatch');
    return 'UTF-8 file read/write';
  });
  await check('sqlite', async () => {
    const { DatabaseSync } = await import('node:sqlite');
    const filename = path.join(workspace, 'probe.sqlite');
    const db = new DatabaseSync(filename);
    try {
      db.exec('PRAGMA journal_mode=WAL; CREATE TABLE probe (value TEXT);');
      db.prepare('INSERT INTO probe VALUES (?)').run('persisted');
    } finally { db.close(); }
    const reopened = new DatabaseSync(filename);
    try {
      if (reopened.prepare('SELECT value FROM probe').get().value !== 'persisted') throw Error('Persistence failed');
    } finally { reopened.close(); }
    return 'WAL and reopen';
  });
  await check('shell', () => {
    const shell = process.env.SHELL || (process.platform === 'android' ? '/system/bin/sh' : '/bin/sh');
    const result = spawnSync(shell, ['-c', 'printf opencode-shell'], { cwd: workspace, encoding: 'utf8', timeout: 5000 });
    if (result.status !== 0 || result.stdout !== 'opencode-shell') throw Error(result.error?.message || `Shell exit ${result.status}`);
    return 'Child process executed';
  });
  await check('git', () => {
    const result = spawnSync('git', ['init', '--quiet', workspace], { encoding: 'utf8', timeout: 5000 });
    if (result.status !== 0) throw Error(result.error?.message || `Git exit ${result.status}`);
    return 'Repository initialized';
  });
  await check('watch', () => new Promise((resolve, reject) => {
    const timer = setTimeout(() => { watcher.close(); reject(Error('No file event within 3 seconds')); }, 3000);
    const watcher = watch(workspace, () => { clearTimeout(timer); watcher.close(); resolve('File event received'); });
    watcher.on('error', error => { clearTimeout(timer); watcher.close(); reject(error); });
    writeFileSync(path.join(workspace, 'watch.txt'), 'changed');
  }));
  await check('http', async () => {
    const server = createServer((request, response) => response.end('opencode-local'));
    try {
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
      const response = await fetch(`http://127.0.0.1:${server.address().port}`, { signal: AbortSignal.timeout(3000) });
      if (await response.text() !== 'opencode-local') throw Error('Loopback response mismatch');
      return 'Loopback HTTP round trip';
    } finally { await new Promise(resolve => server.close(resolve)); }
  });
  await check('pty', async () => {
    // Resolve from the supplied runtime module tree, never the build host's node_modules.
    const require = createRequire(path.join(process.env.OPENCODE_RUNTIME_ROOT || process.cwd(), 'package.json'));
    const pty = require(process.env.OPENCODE_NODE_PTY_PATH || '@lydell/node-pty');
    return await new Promise((resolve, reject) => {
      const proc = pty.spawn(process.env.SHELL || '/system/bin/sh', ['-c', 'printf opencode-pty'], { cols: 80, rows: 24, cwd: workspace, env: process.env });
      let output = '';
      const timer = setTimeout(() => { proc.kill(); reject(Error('PTY timed out')); }, 5000);
      proc.onData(data => { output += data; });
      proc.onExit(event => {
        clearTimeout(timer);
        if (event.exitCode !== 0 || !output.includes('opencode-pty')) return reject(Error(`PTY exit ${event.exitCode}`));
        resolve('PTY output and process exit');
      });
    });
  });
} finally { rmSync(workspace, { recursive: true, force: true }); }
console.log(JSON.stringify({ platform: process.platform, arch: process.arch, node: process.version, android: process.platform === 'android', results }, null, 2));
process.exitCode = results.some(result => !result.ok) ? 1 : 0;
