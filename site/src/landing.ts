interface LandingOptions {
  entryCount: number;
  collectionCount: number;
  copyAction: HTMLButtonElement;
  search: (query: string) => void;
  openCommands: () => void;
}

/** An orientation page for browsing, comparing and deliberately adopting developer tooling. */
export function createLandingPage(options: LandingOptions): HTMLElement {
  const page = document.createElement('article');
  page.className = 'catalog-landing';
  page.setAttribute('aria-labelledby', 'landing-title');
  page.innerHTML = `
    <header class="landing-hero">
      <p class="landing-eyebrow">A field guide for your toolbox</p>
      <h2 id="landing-title">Find the right tool <br>for the job.</h2>
      <p class="landing-lead">Dev Catalog is a curated library of developer scripts, tools and workflows. Each entry records where it came from, its license, the platforms it runs on and what it requires, so you can understand the tradeoffs before you install anything.</p>
      <p class="landing-inventory"></p>
      <div class="landing-actions"></div>
      <p class="landing-caption">Browse the catalog on the left, or paste the copied prompt into your coding agent for a shortlist that fits your machine.</p>
    </header>

    <section aria-labelledby="landing-how">
      <h3 id="landing-how" class="landing-section-title">From a task to a useful addition</h3>
      <ol class="landing-steps">
        <li>
          <div class="landing-step-label"><span aria-hidden="true">01</span><h4>Find</h4></div>
          <div>
            <p>Search for the job you want done: cleaning up branches, finding a regression, or searching code. Short terms work best in the top search, which matches text in titles, summaries, use cases, IDs and tags.</p>
            <div class="landing-searches" role="group" aria-label="Start a fresh example search"></div>
            <p class="landing-caption">Examples start a fresh search and clear active filters.</p>
            <p>Choose a platform to include entries that run on it. Use Filter to narrow by type or source, and remove filter chips to broaden the list. For a search across the entire catalog regardless of filters, open <button class="landing-inline-button" type="button" data-commands>Commands</button> with <kbd>⌘ / Ctrl K</kbd>.</p>
          </div>
        </li>
        <li>
          <div class="landing-step-label"><span aria-hidden="true">02</span><h4>Compare</h4></div>
          <div>
            <p>Open an entry and read <strong>When to use</strong>, reviewer notes and <strong>Overlap</strong>. Check whether something you already have covers the job, then compare related entries.</p>
            <p>Scores are out of 10 and consider value, dependability, ease of use, safety, adoption cost, portability and upkeep. Incomplete ratings have no total. Check the evidence and any blockers. Experimental entries retain their stated limitations.</p>
          </div>
        </li>
        <li>
          <div class="landing-step-label"><span aria-hidden="true">03</span><h4>Use</h4></div>
          <div>
            <p>Use an entry’s <strong>Copy for LLM</strong> action to hand installation guidance to your coding agent, or read its installation instructions and source files yourself.</p>
            <p>Read a script before running it, and check that everything it requires is installed. Workflows are procedures to follow; tools install from their upstream project. Browsing or copying an entry does not install it.</p>
          </div>
        </li>
      </ol>
    </section>

    <div class="landing-reference">
      <section aria-labelledby="landing-evidence">
        <h3 id="landing-evidence" class="landing-section-title">Read the evidence</h3>
        <dl class="landing-evidence">
          <div><dt>Reviewed</dt><dd>Read and assessed by a curator.</dd></div>
          <div><dt>Used</dt><dd>Used in practice.</dd></div>
          <div><dt>Tested</dt><dd>Covered by a linked test.</dd></div>
        </dl>
        <p class="landing-caption">Follow the linked evidence and review notes for what was actually checked.</p>
      </section>
      <section aria-labelledby="landing-shortcuts">
        <h3 id="landing-shortcuts" class="landing-section-title">Keep exploring</h3>
        <ul class="landing-links">
          <li><a href="https://github.com/alex-red/dev-catalog/blob/main/docs/ratings.md" target="_blank" rel="noreferrer">Rating guide <span aria-hidden="true">↗</span></a></li>
          <li><a href="https://github.com/alex-red/dev-catalog/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer">Propose an entry <span aria-hidden="true">↗</span></a></li>
          <li><a href="https://github.com/alex-red/dev-catalog" target="_blank" rel="noreferrer">Project on GitHub <span aria-hidden="true">↗</span></a></li>
        </ul>
        <p class="landing-caption"><kbd>/</kbd> focuses search. Click the catalog name to return here. Agents can read the repository’s <a href="https://raw.githubusercontent.com/alex-red/dev-catalog/main/llms.txt" target="_blank" rel="noreferrer">llms.txt index</a> directly.</p>
      </section>
    </div>`;

  const collections = options.collectionCount ? ` · ${options.collectionCount} collections` : '';
  page.querySelector('.landing-inventory')!.textContent = `${options.entryCount} entries${collections} · Source and license recorded`;
  options.copyAction.title = 'Copy a prompt to ask your agent for a shortlist that fits your machine';
  page.querySelector('.landing-actions')!.append(options.copyAction);
  const examples = page.querySelector('.landing-searches')!;
  for (const query of ['git', 'search', 'cleanup', 'debugging']) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'landing-search';
    button.textContent = query;
    button.setAttribute('aria-label', `Search catalog for ${query}`);
    button.addEventListener('click', () => options.search(query));
    examples.append(button);
  }
  page.querySelector('[data-commands]')!.addEventListener('click', options.openCommands);
  return page;
}
