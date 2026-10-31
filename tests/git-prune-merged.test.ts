import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { repositoryRoot } from '../scripts/library.ts';

const script = join(repositoryRoot, 'entries/scripts/git-prune-merged/git-prune-merged');
// /bin/bash is 3.2 on macOS; running through it keeps the script honest about old Bash.
const bash = process.platform === 'darwin' ? '/bin/bash' : 'bash';

function repository(context: TestContext): (...args: string[]) => string {
  const root = mkdtempSync(join(tmpdir(), 'dev-catalog-prune-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null', GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.com' };
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, env, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  git('commit', '-q', '--allow-empty', '-m', 'init');
  git('branch', 'merged');
  git('checkout', '-q', '-b', 'unmerged');
  git('commit', '-q', '--allow-empty', '-m', 'work');
  git('checkout', '-q', 'main');
  return (...args) => {
    if (args[0] === 'git') return git(...args.slice(1));
    const result = spawnSync(bash, [script, ...args], { cwd: root, env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
}

const branches = (run: ReturnType<typeof repository>) =>
  run('git', 'for-each-ref', '--format=%(refname:short)', 'refs/heads/').trim().split('\n');

test('dry run lists merged branches without deleting them', (context) => {
  const run = repository(context);
  const output = run();
  assert.match(output, /would delete merged/);
  assert.doesNotMatch(output, /unmerged|would delete main/);
  assert.deepEqual(branches(run), ['main', 'merged', 'unmerged']);
});

test('--delete removes only merged branches', (context) => {
  const run = repository(context);
  run('--delete');
  assert.deepEqual(branches(run), ['main', 'unmerged']);
});

test('the current branch and worktree checkouts are kept', (context) => {
  const run = repository(context);
  run('git', 'branch', 'in-worktree');
  const worktree = mkdtempSync(join(tmpdir(), 'dev-catalog-worktree-'));
  rmSync(worktree, { recursive: true });
  context.after(() => rmSync(worktree, { recursive: true, force: true }));
  run('git', 'worktree', 'add', '-q', worktree, 'in-worktree');
  run('git', 'checkout', '-q', 'merged');
  run('--delete', '--base', 'main');
  assert.deepEqual(branches(run), ['in-worktree', 'main', 'merged', 'unmerged']);
});

test('reports when nothing is merged', (context) => {
  const run = repository(context);
  run('git', 'branch', '-D', 'merged');
  assert.match(run(), /No local branches are merged into main/);
});
