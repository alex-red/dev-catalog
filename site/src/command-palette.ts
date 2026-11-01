import { searchCommands, type SearchCommand } from "./command-search";

export function createCommandPalette(config: {
  trigger: HTMLButtonElement;
  commands: () => SearchCommand[];
  defaults: () => SearchCommand[];
}) {
  const dialog = document.createElement("dialog");
  dialog.className = "dialog-modal command-palette";
  dialog.id = "command-palette";
  dialog.setAttribute("aria-label", "Search catalog and commands");
  dialog.innerHTML = `
    <div class="command-search-row">
      <span class="command-search-symbol" aria-hidden="true">⌕</span>
      <input class="command-input" type="text" role="combobox" aria-label="Search catalog and commands"
        aria-autocomplete="list" aria-expanded="true" aria-controls="command-results"
        placeholder="Search entries or run a command…" autocomplete="off" spellcheck="false" />
      <button class="btn-dialog-close" type="button" aria-label="Close command palette">×</button>
    </div>
    <div class="command-results" id="command-results" role="listbox" aria-label="Results"></div>
    <p class="command-status sr-only" role="status"></p>
    <div class="command-footer"><span><kbd>↑</kbd> <kbd>↓</kbd> navigate <kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div>`;
  document.body.append(dialog);
  const input = dialog.querySelector<HTMLInputElement>("input")!;
  const results = dialog.querySelector<HTMLDivElement>(".command-results")!;
  const status = dialog.querySelector<HTMLParagraphElement>(".command-status")!;
  let shown: SearchCommand[] = [];
  let active = 0;
  let previousFocus: HTMLElement | null = null;

  function setActive(index: number, scroll = true) {
    active = index;
    for (const [i, option] of [...results.querySelectorAll<HTMLElement>('[role="option"]')].entries()) {
      option.setAttribute("aria-selected", String(i === active));
      if (i === active) {
        input.setAttribute("aria-activedescendant", option.id);
        if (scroll) option.scrollIntoView({ block: "nearest" });
      }
    }
    if (!shown.length) input.removeAttribute("aria-activedescendant");
  }

  function choose(index: number) {
    const command = shown[index];
    if (!command) return;
    dialog.close();
    command.run();
  }

  function render() {
    const searching = input.value.trim().length > 0;
    const matches = searching ? searchCommands(config.commands(), input.value) : config.defaults();
    shown = matches.slice(0, 30);
    results.replaceChildren();
    let lastGroup = "";
    shown.forEach((command, index) => {
      if (command.group !== lastGroup) {
        const heading = document.createElement("div");
        heading.className = "command-group";
        heading.setAttribute("role", "presentation");
        heading.textContent = command.group;
        results.append(heading);
        lastGroup = command.group;
      }
      const option = document.createElement("div");
      option.id = `command-option-${index}`;
      option.className = "command-option";
      option.setAttribute("role", "option");
      const title = document.createElement("span");
      title.className = "command-title";
      title.textContent = command.title;
      const detail = document.createElement("span");
      detail.className = "command-detail";
      detail.textContent = command.detail;
      option.append(title, detail);
      option.addEventListener("pointermove", () => setActive(index, false));
      option.addEventListener("mousedown", (event) => event.preventDefault());
      option.addEventListener("click", () => choose(index));
      results.append(option);
    });
    if (!shown.length) {
      const empty = document.createElement("p");
      empty.className = "command-empty";
      empty.textContent = "No matching entries or commands. Try a title, tag, or host.";
      results.append(empty);
    }
    status.textContent = `${matches.length} results${matches.length > shown.length ? `; showing the first ${shown.length}. Keep typing to narrow your search` : ""}.`;
    results.scrollTop = 0;
    setActive(0, false);
  }

  function open() {
    if (dialog.open || document.querySelector("dialog[open]")) return;
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    input.value = "";
    render();
    dialog.showModal();
    input.focus();
  }
  config.trigger.setAttribute("aria-controls", dialog.id);
  config.trigger.addEventListener("click", open);
  dialog.querySelector("button")!.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => previousFocus?.focus({ preventScroll: true }));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }
  });
  input.addEventListener("input", render);
  input.addEventListener("keydown", (event) => {
    if (event.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (shown.length) setActive((active + (event.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(active);
    }
  });
  window.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k" && !event.isComposing) {
      event.preventDefault();
      if (dialog.open) dialog.close();
      else open();
    }
  });
}
