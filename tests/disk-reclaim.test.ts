import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { repositoryRoot } from '../scripts/library.ts';

const script = join(repositoryRoot, 'entries/scripts/disk-reclaim/disk-reclaim');
// /bin/bash is 3.2 on macOS; running through it keeps the script honest about old Bash.
const bash = process.platform === 'darwin' ? '/bin/bash' : 'bash';

// A fake $HOME with one cache, one idle project, and a file outside $HOME that must survive.
// PATH is limited to system directories so brew, docker, go and npm on the host are never offered.
// --no-temp keeps the scan off the real temp dirs; tests still select by number, never by risk level.
function sandbox(context: TestContext) {
  const root = mkdtempSync(join(tmpdir(), 'dev-catalog-reclaim-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const home = join(root, 'home');
  const cache = join(home, '.cache', 'some-tool');
  mkdirSync(join(cache, 'entry'), { recursive: true });
  writeFileSync(join(cache, 'entry', 'blob'), 'x'.repeat(64 * 1024));

  const project = join(home, 'code', 'old-app');
  mkdirSync(join(project, 'node_modules', 'dep'), { recursive: true });
  writeFileSync(join(project, 'node_modules', 'dep', 'index.js'), 'x'.repeat(64 * 1024));
  writeFileSync(join(project, 'package.json'), '{}');
  const longAgo = new Date(Date.now() - 200 * 86_400_000);
  utimesSync(join(project, 'package.json'), longAgo, longAgo);
  utimesSync(project, longAgo, longAgo);

  const outside = join(root, 'outside');
  mkdirSync(outside);
  writeFileSync(join(outside, 'victim'), 'keep me');
  mkdirSync(join(home, '.config', 'disk-reclaim'), { recursive: true });
  writeFileSync(join(home, '.config', 'disk-reclaim', 'paths'), `safe\t${join(outside, 'victim')}\tplanted\n`);

  const env = { HOME: home, PATH: '/usr/bin:/bin:/usr/sbin:/sbin', TMPDIR: process.env.TMPDIR ?? '/tmp' };
  const run = (...args: string[]) =>
    spawnSync(bash, [script, '--root', join(home, 'code'), '--min-mb', '0', '--keep-hours', '0', '--no-temp', ...args], { env, encoding: 'utf8' });
  // The list number of the first line mentioning `label`.
  const number = (output: string, label: string) => {
    const line = output.split('\n').find((l) => l.includes(label));
    assert.ok(line, `no item for ${label} in:\n${output}`);
    return line.trim().split(' ')[0];
  };
  return { home, cache, project, outside, run, number };
}

test('--list sorts candidates by risk and changes nothing', (context) => {
  const { cache, project, run } = sandbox(context);
  const result = run('--list');
  assert.equal(result.status, 0, result.stderr);
  const { stdout } = result;
  assert.match(stdout, /SAFE[\s\S]*~\/\.cache\/some-tool/);
  assert.match(stdout, /REBUILD[\s\S]*~\/code\/old-app — node_modules \(\d+d idle\)/);
  assert.match(stdout, /SAFE[\s\S]*planted[\s\S]*REBUILD/);
  assert.ok(stdout.indexOf('~/.cache/some-tool') < stdout.indexOf('node_modules'));
  assert.ok(existsSync(join(cache, 'entry', 'blob')));
  assert.ok(existsSync(join(project, 'node_modules')));
});

test('--dry-run prints the commands for the selection and changes nothing', (context) => {
  const { cache, run, number } = sandbox(context);
  const n = number(run('--list').stdout, '~/.cache/some-tool');
  const result = run('--select', n, '--dry-run');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Will run:[\s\S]*prune_in/);
  assert.match(result.stdout, /dry run — nothing changed/);
  assert.ok(existsSync(join(cache, 'entry', 'blob')));
});

test('a selected cache is emptied but kept, and unselected items are left alone', (context) => {
  const { cache, project, run, number } = sandbox(context);
  const n = number(run('--list').stdout, '~/.cache/some-tool');
  const result = run('--select', n, '--yes');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 ok, 0 skipped, 0 failed/);
  assert.deepEqual(readdirSync(cache), []);
  assert.ok(existsSync(join(project, 'node_modules', 'dep', 'index.js')));
});

test('paths outside $HOME are refused even when listed in the config', (context) => {
  const { outside, run, number } = sandbox(context);
  const n = number(run('--list').stdout, 'planted');
  const result = run('--select', n, '--yes');
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /refusing \(outside \$HOME\)/);
  assert.match(result.stdout, /0 ok, 0 skipped, 1 failed/);
  assert.ok(existsSync(join(outside, 'victim')));
});

test('with --keep-hours, cache entries changed recently are kept', (context) => {
  const { cache, run, number } = sandbox(context);
  const n = number(run('--list', '--keep-hours', '24').stdout, '~/.cache/some-tool');
  const result = run('--select', n, '--yes', '--keep-hours', '24');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.ok(existsSync(join(cache, 'entry', 'blob')));
});
