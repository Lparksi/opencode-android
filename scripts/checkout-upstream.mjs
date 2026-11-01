import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const lock = JSON.parse(readFileSync(path.join(root, 'upstream.lock.json'), 'utf8'));
const source = process.argv.includes('--reference') ? lock.reference : lock.opencode;
const destination = path.join(root, '.upstream', process.argv.includes('--reference') ? 'dsh-mobile-apk' : 'opencode');
function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'git failed');
  return result.stdout.trim();
}
if (!existsSync(destination)) {
  mkdirSync(destination, { recursive: true });
  git(['init', destination]);
  git(['-C', destination, 'remote', 'add', 'origin', source.repository]);
  git(['-C', destination, 'fetch', '--depth=1', 'origin', source.commit]);
  git(['-C', destination, 'checkout', '--detach', 'FETCH_HEAD']);
}
const head = git(['-C', destination, 'rev-parse', 'HEAD']);
if (head !== source.commit) throw new Error(`Source mismatch: expected ${source.commit}, got ${head}. Existing checkout left untouched.`);
if (git(['-C', destination, 'status', '--porcelain'])) throw new Error('Upstream checkout has local changes; preserve them before building.');
console.log(JSON.stringify({ repository: source.repository, commit: head, directory: destination }, null, 2));
