import { lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ajv } from 'ajv';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { parseDocument } from 'yaml';
import { compareRatings, entryScore, rubricAxes, scoreLabel, type Rating } from '../catalog/ratings.ts';

export { entryScore } from '../catalog/ratings.ts';
export type { Evidence } from '../catalog/ratings.ts';

export const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

export const entryTypes = ['script', 'workflow', 'tool'] as const;
export type EntryType = (typeof entryTypes)[number];
export type Platform = 'any' | 'macos' | 'linux' | 'windows';

// The document each non-linked entry must carry; tools are always linked.
export const primaryFiles: Record<EntryType, string | undefined> = {
  script: 'SCRIPT.md', workflow: 'WORKFLOW.md', tool: undefined,
};

export interface EntryMetadata {
  schemaVersion: 1;
  id: string;
  type: EntryType;
  title: string;
  summary: string;
  useWhen: string;
  tags: string[];
  platforms: Platform[];
  requires?: string[];
  /** Interesting but unproven; listed apart from established entries. */
  experimental?: true;
  rating: Rating;
  source: {
    kind: 'original' | 'adapted' | 'vendored' | 'linked';
    url?: string; path?: string; revision?: string; version?: string; retrieved?: string; license: string; author?: string; notes?: string;
  };
  inspiredBy?: { title: string; url: string }[];
  install?: Partial<Record<Platform | 'notes', string>>;
  overlap?: string;
  related?: string[];
  evidence?: string[];
}

export interface Entry extends EntryMetadata {
  /** Curator score out of 10; null when grades are incomplete. */
  score: number | null;
  /** Best link to where the entry came from: the pinned upstream path, else a cited source, GitHub first. */
  sourceUrl?: string;
  /** Repo-relative entry directory. */
  path: string;
  /** Repo-relative installable files (everything except entry.yaml); empty for linked entries. */
  files: string[];
}

export interface Collection {
  schemaVersion: 1;
  id: string;
  title: string;
  description: string;
  entries: string[];
  path: string;
}

export interface Catalog {
  schemaVersion: 1;
  repository: string;
  rawBase: string;
  entries: Entry[];
  collections: Collection[];
}

interface Frontmatter {
  name: string;
  description: string;
  license?: string;
}

interface TagTerm {
  id: string;
  label: string;
  facet: 'topic' | 'task' | 'technology' | 'keyword';
  definition: string;
  aliases?: string[];
}

const ajv = new Ajv({ allErrors: true, strict: true });
const validators = new Map(
  ['skill', 'entry', 'collection', 'tags'].map((name) => [
    name,
    ajv.compile(JSON.parse(readFileSync(join(repositoryRoot, 'catalog/schema', `${name}.schema.json`), 'utf8'))),
  ]),
);

export function validate<T>(schema: string, data: unknown, label: string): T {
  const validator = validators.get(schema)!;
  if (!validator(data)) {
    throw new Error(`${label}: ${ajv.errorsText(validator.errors, { separator: '; ' })}`);
  }
  return data as T;
}

export function readYaml(source: string, label: string): unknown {
  const document = parseDocument(source, { uniqueKeys: true });
  if (document.errors.length) {
    throw new Error(`${label}: ${document.errors.map((error) => error.message).join('; ')}`);
  }
  return document.toJS({ maxAliasCount: 50 });
}

export function frontmatter(source: string, label: string): { data: unknown; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(source);
  if (!match) throw new Error(`${label}: expected YAML frontmatter`);
  const body = source.slice(match[0].length).trim();
  if (!body) throw new Error(`${label}: instruction body is empty`);
  return { data: readYaml(match[1], label), body };
}

// Check every path segment before reading, rejecting symlinks so content stays portable.
export function safePath(scope: string, candidate: string, allowMissingLeaf = false): string {
  const root = resolve(scope);
  const target = resolve(candidate);
  const local = relative(root, target);
  if (local === '..' || local.startsWith(`..${sep}`) || isAbsolute(local)) {
    throw new Error(`Path escapes its content root: ${candidate}`);
  }
  const segments = local ? local.split(sep) : [];
  let current = root;
  for (let index = -1; index < segments.length; index++) {
    if (index >= 0) current = join(current, segments[index]);
    let entry;
    try {
      entry = lstatSync(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        if (allowMissingLeaf && index === segments.length - 1) return target;
        throw new Error(`Missing path: ${current}`);
      }
      throw error;
    }
    if (entry.isSymbolicLink()) throw new Error(`Symlinks are not portable content: ${current}`);
    if (!entry.isDirectory() && !entry.isFile()) throw new Error(`Unsupported file type: ${current}`);
  }
  return target;
}

function repoFile(root: string, path: string): string {
  if (isAbsolute(path) || path.includes('\\') || /^[A-Za-z]:/u.test(path)) {
    throw new Error(`Expected a portable relative path: ${path}`);
  }
  const file = safePath(root, resolve(root, path));
  if (!lstatSync(file).isFile()) throw new Error(`Expected a file: ${path}`);
  return file;
}

function localName(root: string, file: string): string {
  return relative(root, file).split(sep).join('/');
}

function directoryEntries(root: string, directory: string, optional = false): string[] {
  let folder;
  try {
    folder = safePath(root, join(root, directory));
  } catch (error) {
    if (optional && (error as Error).message.startsWith('Missing path:')) return [];
    throw error;
  }
  return readdirSync(folder).sort().map((name) => safePath(root, join(folder, name)));
}

function filesWithin(directory: string): string[] {
  return directoryEntries(directory, '').flatMap((file) =>
    lstatSync(file).isDirectory() ? filesWithin(file) : [file],
  );
}

// Relative links must resolve inside the bundle; machine-local links never travel.
function checkPortableLinks(directory: string, file: string, source: string): void {
  function inspect(node: { type: string; url?: string; children?: unknown[] }): void {
    if (node.url && /^(?:file:|[a-z]:[\\/])/iu.test(node.url)) {
      throw new Error(`${file}: machine-local resource links are not portable: ${node.url}`);
    }
    if (node.url && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/iu.test(node.url)) {
      const destination = decodeURIComponent(node.url.split(/[?#]/u)[0]);
      if (isAbsolute(destination) || destination.includes('\\')) {
        throw new Error(`${file}: expected a portable resource link: ${node.url}`);
      }
      safePath(directory, resolve(dirname(file), destination));
    }
    for (const child of node.children ?? []) inspect(child as Parameters<typeof inspect>[0]);
  }
  inspect(fromMarkdown(source));
}

export function validateSkillBundle(directory: string): Frontmatter {
  const skill = safePath(directory, join(directory, 'SKILL.md'));
  const parsed = frontmatter(readFileSync(skill, 'utf8'), skill);
  const metadata = validate<Frontmatter>('skill', parsed.data, skill);
  if (metadata.name !== basename(directory)) throw new Error(`${skill}: skill name must match its directory`);
  for (const file of filesWithin(directory).filter((file) => /\.md$/iu.test(file))) {
    checkPortableLinks(directory, file, file === skill ? parsed.body : readFileSync(file, 'utf8'));
  }
  return metadata;
}

function assertUnique(values: string[], label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Duplicate ${label}: ${value}`);
    seen.add(value);
  }
}

// Lookup form shared by IDs, labels and aliases: case, spaces, hyphens and underscores do not distinguish terms.
export function normalizeTag(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/gu, ' ');
}

export function loadTagVocabulary(root = repositoryRoot): TagTerm[] {
  const path = 'catalog/tags.yaml';
  const { terms } = validate<{ terms: TagTerm[] }>('tags', readYaml(readFileSync(repoFile(root, path), 'utf8'), path), path);
  assertUnique(terms.map((term) => term.id), 'tag ID');
  const owners = new Map<string, string>();
  for (const term of terms) {
    for (const name of new Set([term.id, term.label, ...(term.aliases ?? [])].map(normalizeTag))) {
      const owner = owners.get(name);
      if (owner) throw new Error(`${path}: "${name}" names both ${owner} and ${term.id}`);
      owners.set(name, term.id);
    }
  }
  return terms;
}

const github = (url: string) => url.startsWith('https://github.com/');

export function sourceUrl(entry: EntryMetadata): string | undefined {
  const { url, path, revision } = entry.source;
  if (url && github(url) && (path || revision)) {
    const view = path && /\.[A-Za-z0-9]+$/u.test(path) ? 'blob' : 'tree';
    return `${url.replace(/\/$/u, '')}/${view}/${revision ?? 'HEAD'}${path ? `/${path}` : ''}`;
  }
  const cited = [...(url ? [url] : []), ...(entry.inspiredBy ?? []).map((link) => link.url)];
  return cited.find(github) ?? cited[0];
}

// The published location comes from package.json so the index, llms.txt, and discovery skill agree.
export function repositoryLocation(root = repositoryRoot): { repository: string; rawBase: string } {
  const manifest = JSON.parse(readFileSync(repoFile(root, 'package.json'), 'utf8'));
  const url = String(manifest.repository?.url ?? '');
  const match = /^https:\/\/github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?$/u.exec(url);
  if (!match) throw new Error('package.json: repository.url must be an https://github.com/OWNER/REPO URL');
  return { repository: `https://github.com/${match[1]}`, rawBase: `https://raw.githubusercontent.com/${match[1]}/main/` };
}

function loadEntry(root: string, directory: string, type: EntryType): Entry {
  const label = localName(root, directory);
  if (!lstatSync(directory).isDirectory()) throw new Error(`Expected an entry directory: ${label}`);
  const metadataFile = repoFile(root, `${label}/entry.yaml`);
  const entry = validate<EntryMetadata>('entry', readYaml(readFileSync(metadataFile, 'utf8'), `${label}/entry.yaml`), `${label}/entry.yaml`);
  if (entry.id !== basename(directory)) throw new Error(`${label}: entry ID must match its directory`);
  if (entry.type !== type) throw new Error(`${label}: type ${entry.type} belongs under entries/${entry.type}s/`);
  if (entry.platforms.includes('any') && entry.platforms.length > 1) {
    throw new Error(`${label}: platform any already covers ${entry.platforms.filter((p) => p !== 'any').join(', ')}`);
  }

  const files = filesWithin(directory).filter((file) => file !== metadataFile);
  const primary = primaryFiles[type];
  if (entry.source.kind === 'linked') {
    if (files.length) throw new Error(`${label}: linked entries hold only entry.yaml; vendor the content or remove ${localName(root, files[0])}`);
  } else {
    if (!primary) throw new Error(`${label}: ${type} entries must be linked`);
    const main = repoFile(root, `${label}/${primary}`);
    if (!readFileSync(main, 'utf8').trim()) throw new Error(`${label}/${primary}: content is empty`);
    if (type === 'script' && files.length < 2) throw new Error(`${label}: script entries ship at least one script beside ${primary}`);
    for (const file of files.filter((file) => /\.md$/iu.test(file))) checkPortableLinks(directory, file, readFileSync(file, 'utf8'));
    if (entry.source.kind === 'vendored' && !files.some((file) => /^LICEN[CS]E(?:\.\w+)?$/iu.test(basename(file)))) {
      throw new Error(`${label}: vendored entries must include the upstream license file`);
    }
  }
  for (const path of entry.evidence ?? []) repoFile(root, path);
  if (entry.rating.review && !readFileSync(repoFile(root, entry.rating.review), 'utf8').trim()) {
    throw new Error(`${label}: rating review is empty`);
  }
  const link = sourceUrl(entry);
  return { ...entry, score: entryScore(entry.rating), ...(link && { sourceUrl: link }), path: label, files: files.map((file) => localName(root, file)) };
}

export function loadCatalog(root = repositoryRoot): Catalog {
  const entries: Entry[] = [];
  for (const folder of directoryEntries(root, 'entries')) {
    const type = entryTypes.find((name) => `${name}s` === basename(folder));
    if (!type || !lstatSync(folder).isDirectory()) throw new Error(`Unknown entry folder: ${localName(root, folder)}`);
    for (const directory of directoryEntries(root, localName(root, folder))) entries.push(loadEntry(root, directory, type));
  }
  assertUnique(entries.map((entry) => entry.id), 'entry ID');
  assertUnique(entries.map((entry) => entry.title.toLowerCase()), 'entry title');
  const ids = new Set(entries.map((entry) => entry.id));

  const vocabulary = loadTagVocabulary(root);
  const registered = new Set(vocabulary.map((term) => term.id));
  for (const entry of entries) {
    for (const tag of entry.tags) {
      if (!registered.has(tag)) throw new Error(`${entry.path}: tag ${tag} is not registered in catalog/tags.yaml`);
    }
    for (const id of entry.related ?? []) {
      if (id === entry.id || !ids.has(id)) throw new Error(`${entry.path}: unknown related entry ${id}`);
    }
  }
  const used = new Set(entries.flatMap((entry) => entry.tags));
  for (const term of vocabulary) {
    if (!used.has(term.id)) throw new Error(`catalog/tags.yaml: tag ${term.id} is not used by any entry`);
  }

  const collections = directoryEntries(root, 'collections', true).map((file) => {
    const path = localName(root, file);
    if (!file.endsWith('.yaml') || !lstatSync(file).isFile()) throw new Error(`Expected a YAML collection: ${path}`);
    const collection = validate<Omit<Collection, 'path'>>('collection', readYaml(readFileSync(file, 'utf8'), path), path);
    if (basename(file) !== `${collection.id}.yaml`) throw new Error(`${path}: collection ID must match its filename`);
    for (const id of collection.entries) if (!ids.has(id)) throw new Error(`${path}: unknown entry ${id}`);
    return { ...collection, path };
  });
  assertUnique(collections.map((collection) => collection.id), 'collection ID');

  // The plugin ships only the discovery skill; it must point at the published catalog.
  const location = repositoryLocation(root);
  for (const directory of directoryEntries(root, 'skills')) {
    validateSkillBundle(directory);
    if (!readFileSync(join(directory, 'SKILL.md'), 'utf8').includes(`${location.rawBase}catalog/index.json`)) {
      throw new Error(`${localName(root, directory)}/SKILL.md: must reference ${location.rawBase}catalog/index.json`);
    }
  }

  const order = (entry: Entry) => entryTypes.indexOf(entry.type);
  entries.sort((a, b) => order(a) - order(b) || a.id.localeCompare(b.id));
  return { schemaVersion: 1, ...location, entries, collections };
}

export function renderCatalog(catalog: Catalog): string {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

const sectionTitles: Record<EntryType, string> = { script: 'Scripts', workflow: 'Workflows', tool: 'Tools' };

// llms.txt (https://llmstxt.org): a compact, ranked index an agent can read in one fetch.
export function renderLlmsText(catalog: Catalog): string {
  const url = (path: string) => `${catalog.rawBase}${path}`;
  const weights = rubricAxes.map(({ label, weight }) => `${label.toLowerCase()} ${weight}%`).join(', ');
  const lines = [
    '# Dev Catalog',
    '',
    '> A curated, rated catalog of useful developer scripts, tools, and workflows. Every entry records where it came from, its license, the platforms it runs on, what it requires, and a curator rating.',
    '',
    `Full metadata for every entry is in [catalog/index.json](${url('catalog/index.json')}). Install steps by entry type are in the [install guide](${url('skills/dev-catalog/references/install.md')}). Repository: ${catalog.repository}`,
    '',
    `Rubric (dev-v1): seven 0–4 grades weighted by ${weights}; weighted total / 40 gives a score out of 10. Higher is better on every axis. Missing grades produce no score. See the [rating guide](${url('docs/ratings.md')}). Within each section, complete ratings come first, then incomplete ones, then entries with blockers. Evidence: reviewed, used, tested. Select for fit first, and never let a high score clear a blocker. Read a script before running it.`,
  ];
  const byScore = (a: Entry, b: Entry) => compareRatings(a, b) || a.id.localeCompare(b.id);
  const line = (entry: Entry) => {
    const primary = primaryFiles[entry.type];
    const target = entry.source.kind === 'linked' || !primary ? entry.sourceUrl! : url(`${entry.path}/${primary}`);
    const origin = entry.source.kind === 'original'
      ? `original${entry.sourceUrl ? `, informed by ${entry.sourceUrl}` : ''}` : `${entry.source.kind} from ${entry.sourceUrl}`;
    const kind = entry.experimental ? `type ${entry.type}, ` : '';
    const blockers = entry.rating.blockers?.length
      ? `, blockers: ${entry.rating.blockers.map((blocker) => `${blocker.scope}: ${blocker.reason}`).join('; ')}` : '';
    const requires = entry.requires?.length ? `, requires ${entry.requires.join(', ')}` : '';
    return `- [${entry.title}](${target}): ${entry.summary} Use when: ${entry.useWhen} — id \`${entry.id}\`, ${kind}${scoreLabel(entry)}${blockers}, evidence ${entry.rating.evidence}, platforms ${entry.platforms.join('/')}${requires}, tags ${entry.tags.join(', ')}, ${origin}, [metadata](${url(`${entry.path}/entry.yaml`)})`;
  };
  for (const type of entryTypes) {
    const group = catalog.entries.filter((entry) => entry.type === type && !entry.experimental).sort(byScore);
    if (!group.length) continue;
    lines.push('', `## ${sectionTitles[type]}`, '', ...group.map(line));
  }
  const experimental = catalog.entries.filter((entry) => entry.experimental).sort(byScore);
  if (experimental.length) {
    lines.push('', '## Experimental', '', 'Interesting but unproven. Recommend these only when the user asks for experimental options, and say that they are experimental.', '');
    lines.push(...experimental.map(line));
  }
  if (catalog.collections.length) {
    lines.push('', '## Collections', '');
    for (const collection of catalog.collections) {
      lines.push(`- [${collection.title}](${url(collection.path)}): ${collection.description} Entries: ${collection.entries.join(', ')}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

const tableStart = '<!-- catalog:entries:start -->';
const tableEnd = '<!-- catalog:entries:end -->';

// The README's browsable entry list, one table per type, generated between the markers above.
export function renderEntryTable(catalog: Catalog): string {
  const cell = (text: string) => text.replace(/\|/gu, '\\|').replace(/\s+/gu, ' ');
  const byScore = (a: Entry, b: Entry) => compareRatings(a, b) || a.id.localeCompare(b.id);
  const link = (entry: Entry) => {
    const primary = primaryFiles[entry.type];
    return entry.source.kind === 'linked' || !primary ? entry.source.url ?? entry.sourceUrl! : `${entry.path}/${primary}`;
  };
  const sections: string[] = [];
  for (const type of entryTypes) {
    const group = catalog.entries.filter((entry) => entry.type === type).sort(byScore);
    if (!group.length) continue;
    const rows = group.map((entry) => {
      const title = `[${cell(entry.title)}](${link(entry)})${entry.experimental ? ' (experimental)' : ''}`;
      return `| ${title} | ${cell(entry.useWhen)} | ${entry.platforms.join(', ')} | ${scoreLabel(entry)} |`;
    });
    sections.push(`### ${sectionTitles[type]}\n\n| Entry | Use it when | Platforms | Score |\n| --- | --- | --- | --- |\n${rows.join('\n')}`);
  }
  return sections.join('\n\n');
}

export function renderReadme(readme: string, catalog: Catalog): string {
  const start = readme.indexOf(tableStart);
  const end = readme.indexOf(tableEnd);
  if (start < 0 || end < start) throw new Error(`README.md: expected ${tableStart} and ${tableEnd} markers`);
  return `${readme.slice(0, start + tableStart.length)}\n\n${renderEntryTable(catalog)}\n\n${readme.slice(end)}`;
}

const generated = (catalog: Catalog, root: string) => [
  ['catalog/index.json', renderCatalog(catalog)],
  ['llms.txt', renderLlmsText(catalog)],
  ['README.md', renderReadme(readFileSync(repoFile(root, 'README.md'), 'utf8'), catalog)],
] as const;

export function checkCatalog(root = repositoryRoot): void {
  for (const [path, content] of generated(loadCatalog(root), root)) {
    let current;
    try {
      current = readFileSync(repoFile(root, path), 'utf8');
    } catch {
      current = undefined;
    }
    if (current !== content) throw new Error(`${path} is stale. Run bun run catalog:build and review the result.`);
  }
}

export function writeCatalog(root = repositoryRoot): void {
  for (const [path, content] of generated(loadCatalog(root), root)) {
    writeFileSync(safePath(root, join(root, path), true), content);
  }
}
