import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { stringify } from 'yaml';
import { compareRatings, type Rating } from '../catalog/ratings.ts';
import { checkCatalog, entryScore, loadCatalog, readYaml, repositoryRoot, writeCatalog } from '../scripts/library.ts';

const sandboxPaths = ['entries', 'skills', 'collections', 'catalog', 'docs', 'tests', 'package.json', 'llms.txt', 'README.md'];

function sandbox(context: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), 'dev-catalog-test-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  for (const name of sandboxPaths) {
    if (existsSync(join(repositoryRoot, name))) cpSync(join(repositoryRoot, name), join(root, name), { recursive: true });
  }
  return root;
}

function editEntry(root: string, path: string, change: (entry: Record<string, unknown>) => void): void {
  const file = join(root, path, 'entry.yaml');
  const entry = readYaml(readFileSync(file, 'utf8'), file) as Record<string, unknown>;
  change(entry);
  writeFileSync(file, stringify(entry));
}

const rating = (dimensions: Rating['dimensions'], extra: Partial<Rating> = {}): Rating =>
  ({ rubric: 'dev-v1', dimensions, evidence: 'reviewed', reviewed: '2026-10-31', notes: 'n', ...extra });

const full = { value: 4, dependability: 4, ease: 4, safety: 4, adoption: 4, portability: 4, upkeep: 4 };

test('the repository catalog loads and generated files are current', () => {
  const catalog = loadCatalog();
  assert.ok(catalog.entries.length > 0);
  checkCatalog();
});

test('scores are weighted out of 10 and incomplete grades have no score', () => {
  assert.equal(entryScore(rating(full)), 10);
  assert.equal(entryScore(rating({ ...full, upkeep: 0 })), 9.5);
  assert.equal(entryScore(rating({ ...full, upkeep: undefined })), null);
});

test('blockers and incomplete ratings rank after complete ones', () => {
  const complete = { rating: rating(full), score: 5 };
  const incomplete = { rating: rating({ value: 4 }), score: null };
  const blocked = { rating: rating(full, { blockers: [{ scope: 's', reason: 'r' }] }), score: 10 };
  assert.deepEqual([blocked, incomplete, complete].sort(compareRatings), [complete, incomplete, blocked]);
});

test('missing grades require named unknowns', (context) => {
  const root = sandbox(context);
  editEntry(root, 'entries/tools/ripgrep', (entry) => {
    delete (entry.rating as Rating).dimensions.upkeep;
  });
  assert.throws(() => loadCatalog(root), /unknowns/);
});

test('the entry ID must match its directory', (context) => {
  const root = sandbox(context);
  editEntry(root, 'entries/tools/ripgrep', (entry) => { entry.id = 'rg'; });
  assert.throws(() => loadCatalog(root), /entry ID must match its directory/);
});

test('tags must be registered', (context) => {
  const root = sandbox(context);
  editEntry(root, 'entries/tools/ripgrep', (entry) => { entry.tags = ['search', 'cli', 'unregistered']; });
  assert.throws(() => loadCatalog(root), /tag unregistered is not registered/);
});

test('linked entries hold only entry.yaml', (context) => {
  const root = sandbox(context);
  writeFileSync(join(root, 'entries/tools/ripgrep/README.md'), '# copy\n');
  assert.throws(() => loadCatalog(root), /linked entries hold only entry.yaml/);
});

test('tools must be linked', (context) => {
  const root = sandbox(context);
  editEntry(root, 'entries/tools/ripgrep', (entry) => { entry.source = { kind: 'original', license: 'MIT' }; });
  assert.throws(() => loadCatalog(root), /must be equal to constant/);
});

test('linked entries need install steps', (context) => {
  const root = sandbox(context);
  editEntry(root, 'entries/tools/ripgrep', (entry) => { delete entry.install; });
  assert.throws(() => loadCatalog(root), /install/);
});

test('script entries ship a script beside SCRIPT.md', (context) => {
  const root = sandbox(context);
  rmSync(join(root, 'entries/scripts/git-prune-merged/git-prune-merged'));
  assert.throws(() => loadCatalog(root), /ship at least one script/);
});

test('vendored entries must include the upstream license', (context) => {
  const root = sandbox(context);
  editEntry(root, 'entries/workflows/git-bisect-regression', (entry) => {
    entry.source = { kind: 'vendored', url: 'https://github.com/example/repo', revision: 'a'.repeat(40), retrieved: '2026-10-31', license: 'MIT', author: 'x' };
  });
  assert.throws(() => loadCatalog(root), /upstream license file/);
});

test('raised evidence needs linked evidence files', (context) => {
  const root = sandbox(context);
  editEntry(root, 'entries/tools/ripgrep', (entry) => { (entry.rating as Rating).evidence = 'used'; });
  assert.throws(() => loadCatalog(root), /evidence/);
});

test('stale generated files are reported', (context) => {
  const root = sandbox(context);
  writeCatalog(root);
  checkCatalog(root);
  editEntry(root, 'entries/tools/ripgrep', (entry) => { entry.summary = 'Changed.'; });
  assert.throws(() => checkCatalog(root), /stale/);
});

test('the README needs its entry table markers', (context) => {
  const root = sandbox(context);
  writeFileSync(join(root, 'README.md'), '# Dev Catalog\n');
  assert.throws(() => checkCatalog(root), /catalog:entries:start/);
});
