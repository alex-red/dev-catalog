import { readFileSync } from 'node:fs';
import type { Catalog } from './library.ts';

const catalog = JSON.parse(readFileSync(new URL('../catalog/index.json', import.meta.url), 'utf8')) as Catalog;
const tools = catalog.entries.filter((entry) => entry.type === 'tool' && entry.source.kind === 'linked');
const queries = tools.map((entry) => {
  const commit = entry.source.revision;
  if (!commit || !/^[0-9a-f]{40}$/.test(commit)) throw new Error(`Missing source commit for ${entry.id}`);
  return { commit };
});

const response = await fetch('https://api.osv.dev/v1/querybatch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ queries }),
  signal: AbortSignal.timeout(30_000),
});
if (!response.ok) throw new Error(`OSV returned HTTP ${response.status}`);
const { results } = await response.json() as { results?: Array<{ vulns?: Array<{ id: string }> }> };
if (!Array.isArray(results) || results.length !== tools.length || results.some((result) => !result)) {
  throw new Error('Incomplete OSV response');
}

let untracked = 0;
for (const [index, entry] of tools.entries()) {
  const tracked = new Set((entry.rating.blockers ?? []).flatMap(({ reason }) => reason.match(/[\w]+(?:-[\w]+)+/g) ?? []));
  for (const { id } of entry.rating.advisories ?? []) tracked.add(id);
  for (const { id } of results[index].vulns ?? []) {
    const known = tracked.has(id);
    console.log(`${entry.id} ${entry.source.version}: ${id} (${known ? 'documented' : 'needs triage'})`);
    if (!known) untracked++;
  }
}
console.log(`Queried ${tools.length} upstream source commits. Installed builds and transitive dependencies are outside this check.`);
if (untracked) process.exitCode = 1;
