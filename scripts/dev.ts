import { watch } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';
import { repositoryRoot, writeCatalog } from './library.ts';

// Serves the catalog site and regenerates the catalog whenever an entry or the tag vocabulary changes;
// Vite then reloads the page from the new catalog/index.json. README.md and the generated files are
// outputs, so they are not watched. Restart after editing catalog/schema.
const rebuild = () => {
  const time = new Date().toLocaleTimeString();
  try {
    writeCatalog();
    console.log(`[${time}] Generated catalog/index.json, llms.txt, and the README entry table.`);
  } catch (error) {
    console.error(`[${time}] ${(error as Error).message}`);
  }
};

let timer: ReturnType<typeof setTimeout> | undefined;
const schedule = () => {
  clearTimeout(timer);
  timer = setTimeout(rebuild, 100);
};

rebuild();
watch(join(repositoryRoot, 'entries'), { recursive: true }, schedule);
watch(join(repositoryRoot, 'catalog'), (_event, file) => {
  if (file === 'tags.yaml') schedule();
});

const server = await createServer({ configFile: join(repositoryRoot, 'vite.config.ts') });
await server.listen();
server.printUrls();
console.log('Watching entries/ and catalog/tags.yaml. Press Ctrl+C to stop.');
