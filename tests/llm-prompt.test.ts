import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { installPrompt } from '../site/src/llm-prompt.ts';

const catalog = JSON.parse(readFileSync(new URL('../catalog/index.json', import.meta.url), 'utf8'));
const revision = 'abcdef1234567890';

test('every entry type has a scoped prompt with complete files, provenance and install overrides', () => {
  const types = new Set<string>();
  for (const entry of catalog.entries) {
    types.add(entry.type);
    const prompt = installPrompt({ revision, entries: catalog.entries, entry });
    assert.ok(prompt.includes(`${entry.type}: ${entry.id}`));
    assert.ok(prompt.includes(JSON.stringify(entry.source)));
    for (const file of entry.files) assert.ok(prompt.includes(`/${revision}/${file}`));
    if (entry.install) assert.ok(prompt.includes(JSON.stringify(entry.install, null, 2)));
    if (entry.experimental) assert.ok(prompt.includes('— experimental'));
    assert.ok(prompt.includes('obtain explicit approval for each'));
    assert.ok(prompt.includes('do not execute its steps'));
    assert.ok(!prompt.includes('https://raw.githubusercontent.com/alex-red/dev-catalog/main/'));
  }
  assert.equal(types.size, 3);
});

test('collections include exactly their members and reject missing IDs rather than silently omitting them', () => {
  const collection = { id: 'git', title: 'Git', path: 'collections/git.yaml', entries: ['git-prune-merged'] };
  const prompt = installPrompt({ revision, entries: catalog.entries, collection });
  assert.ok(prompt.includes(`/${revision}/${collection.path}`));
  for (const entry of catalog.entries) {
    assert.equal(prompt.includes(`Metadata: https://raw.githubusercontent.com/alex-red/dev-catalog/${revision}/${entry.path}/entry.yaml`), collection.entries.includes(entry.id));
  }
  assert.throws(() => installPrompt({ revision, entries: [], collection }), /Unknown catalog entry/);
});

test('overview requests recommendations and selection before installation', () => {
  const prompt = installPrompt({ revision, entries: catalog.entries });
  assert.ok(prompt.includes('wait for my selection'));
  assert.ok(prompt.includes('Do not install the entire catalog'));
  assert.ok(!prompt.includes('Metadata:'));
});
