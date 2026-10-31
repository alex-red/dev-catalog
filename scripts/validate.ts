import { loadCatalog } from './library.ts';

try {
  if (process.argv.length !== 2) throw new Error('Usage: bun run validate');
  const catalog = loadCatalog();
  console.log(`Validated ${catalog.entries.length} entries and ${catalog.collections.length} collection(s).`);
  console.log('Structural validation only; no script or tool behavior was exercised.');
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
}
