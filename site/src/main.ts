import { compareRatings, rubricAxes, scoreLabel, type Rating } from "../../catalog/ratings";
import data from "../../catalog/index.json";
import "./styles.css";
import "./scrollbars.css";
import { catalogIcon } from "./icons";
import { highlightSource } from "./highlight";
import { createLandingPage } from "./landing";
import { createCombobox, type ComboOption } from "./combobox";
import { createCommandPalette } from "./command-palette";
import type { SearchCommand } from "./command-search";
import { installPrompt } from "./llm-prompt";

declare const __CATALOG_REVISION__: string;

interface Source {
  kind: string;
  license: string;
  author?: string;
  url?: string;
  path?: string;
  revision?: string;
  version?: string;
  retrieved?: string;
}

type Platform = "macos" | "linux" | "windows";
type InstallGuide = Partial<Record<Platform | "any" | "notes", string>>;

interface CatalogEntry {
  id: string;
  type: string;
  title: string;
  summary: string;
  useWhen: string;
  tags: string[];
  platforms: string[];
  requires?: string[];
  experimental?: boolean;
  score: number | null;
  sourceUrl?: string;
  path: string;
  files: string[];
  rating: Rating;
  source: Source;
  install?: InstallGuide;
  inspiredBy?: { title: string; url: string }[];
  overlap?: string;
  related?: string[];
  evidence?: string[];
}

interface Collection {
  id: string;
  title: string;
  description: string;
  path: string;
  entries: string[];
}

const catalog = data as unknown as {
  entries: CatalogEntry[];
  collections: Collection[];
};

type Kind = string;

interface Item {
  kind: Kind;
  id: string;
  title: string;
  summary: string;
  score?: number | null;
  tags: string[];
  platforms: string[];
  evidence?: string;
  reviewed?: string;
  sourceKind?: string;
  files: string[];
  entry?: CatalogEntry;
  collection?: Collection;
}

// Lazy raw imports keyed by repo-relative path; HMR reloads them on edit.
const sources = Object.fromEntries(
  Object.entries(
    import.meta.glob(["../../entries/**/*", "../../collections/*.yaml"], { query: "?raw", import: "default" }) as Record<
      string,
      () => Promise<string>
    >,
  ).map(([path, load]) => [path.replace("../../", ""), load]),
);

const kinds: Kind[] = ["script", "workflow", "tool", "experimental", "collection"];
const kindLabels: Record<Kind, string> = {
  script: "Scripts",
  workflow: "Workflows",
  tool: "Tools",
  experimental: "Experimental",
  collection: "Collections",
};

const platformLabels: Record<string, string> = { any: "Any", macos: "macOS", linux: "Linux", windows: "Windows" };
const platformOptions = ["macos", "linux", "windows"];
const evidenceTiers = ["tested", "used", "reviewed"];
const typeOptions = ["script", "workflow", "tool", "collection"];
const sourceKinds = ["original", "adapted", "vendored", "linked"];

// Experimental entries are listed apart from established ones, as in llms.txt.
const treeGroup = (item: Item) => (item.entry?.experimental ? "experimental" : item.kind);

const runsOn = (platforms: string[], platform: string) => platforms.includes("any") || platforms.includes(platform);

type SortKey = "score" | "name" | "evidence" | "reviewed";
const sorters: Record<SortKey, (a: Item, b: Item) => number> = {
  score: (a, b) => a.entry && b.entry ? compareRatings(a.entry, b.entry) || a.title.localeCompare(b.title) : a.title.localeCompare(b.title),
  name: (a, b) => a.title.localeCompare(b.title),
  evidence: (a, b) => evidenceTiers.indexOf(a.evidence ?? "") - evidenceTiers.indexOf(b.evidence ?? "") || sorters.score(a, b),
  reviewed: (a, b) => (b.reviewed ?? "").localeCompare(a.reviewed ?? ""),
};

const items: Item[] = [
  ...catalog.entries.map((e) => ({
    kind: e.type,
    id: e.id,
    title: e.title,
    summary: e.summary,
    score: e.score,
    tags: e.tags,
    platforms: e.platforms,
    evidence: e.rating.evidence,
    reviewed: e.rating.reviewed,
    sourceKind: e.source.kind,
    files: [`${e.path}/entry.yaml`, ...e.files],
    entry: e,
  })),
  ...catalog.collections.map((c) => ({
    kind: "collection",
    id: c.id,
    title: c.title,
    summary: c.description,
    tags: ["collection"],
    platforms: ["any"],
    files: [c.path],
    collection: c,
  })),
];

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const input = $<HTMLInputElement>("#q");
const clearInputBtn = $<HTMLButtonElement>("#q-clear");
const matchCount = $<HTMLSpanElement>("#match-count");
const clearAllFiltersBtn = $<HTMLButtonElement>("#clear-all-filters");

const platformsBox = $("#platforms");
const evidenceBox = $("#evidence");
const sidebarControls = $("#sidebar-controls");
const comboRow = $("#combo-row");
const filterTokens = $("#filter-tokens");
const showExperimental = { checked: true };

const list = $("#list");
const viewer = $("#viewer");
const introDialog = $<HTMLDialogElement>("#intro-dialog");
const introToggle = $<HTMLButtonElement>("#intro-toggle");
const introClose = $<HTMLButtonElement>("#intro-close");
const treeToggleAllBtn = $<HTMLButtonElement>("#tree-toggle-all");
const sidebar = $("#catalog-sidebar");
const browseToggle = $<HTMLButtonElement>("#browse-toggle");
const narrowLayout = matchMedia("(max-width: 700px)");

function setCatalogExpanded(expanded: boolean) {
  sidebar.classList.toggle("is-collapsed", !expanded);
  browseToggle.setAttribute("aria-expanded", String(expanded));
  browseToggle.textContent = expanded ? "Hide catalog" : "Browse catalog";
}

browseToggle.addEventListener("click", () => setCatalogExpanded(browseToggle.getAttribute("aria-expanded") !== "true"));
// Keep reading space on small screens; browsing stays one press away.
setCatalogExpanded(!narrowLayout.matches);
narrowLayout.addEventListener("change", () => setCatalogExpanded(!narrowLayout.matches));
list.addEventListener("click", (event) => {
  if (narrowLayout.matches && (event.target as Element).closest("a.tree-item")) {
    setCatalogExpanded(false);
    viewer.focus({ preventScroll: true });
  }
});
$(".skip-link").addEventListener("click", (event) => {
  event.preventDefault();
  viewer.focus();
});

const activePlatforms = new Set<string>();
const activeEvidence = new Set<string>();
const activeTypes = new Set<string>();
const activeSourceKinds = new Set<string>();
let sortKey: SortKey = "score";

// Remember the sort order per viewer; storage can be unavailable, so it is best effort.
try {
  const saved = localStorage.getItem("catalog-sort");
  if (saved && saved in sorters) sortKey = saved as SortKey;
} catch {}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function chip(label: string, active: Set<string>, onChange: () => void, displayLabel?: string) {
  const b = el("button", displayLabel ?? label, "chip");
  b.type = "button";
  b.setAttribute("aria-pressed", String(active.has(label)));
  b.addEventListener("click", () => {
    active.has(label) ? active.delete(label) : active.add(label);
    onChange();
  });
  return b;
}

function hasFilters(): boolean {
  return activePlatforms.size > 0 || activeEvidence.size > 0 || activeTypes.size > 0 || activeSourceKinds.size > 0 ||
    !showExperimental.checked || input.value.trim().length > 0;
}

function clearFilters() {
  activePlatforms.clear();
  activeEvidence.clear();
  activeTypes.clear();
  activeSourceKinds.clear();
  showExperimental.checked = true;
  input.value = "";
  clearInputBtn.hidden = true;
  renderControls();
  renderList();
  input.focus();
}

function visible(): Item[] {
  const q = input.value.trim().toLowerCase();
  return items.filter((e) => {
    if (activePlatforms.size > 0 && ![...activePlatforms].some((p) => runsOn(e.platforms, p))) return false;
    if (activeEvidence.size > 0 && (!e.evidence || !activeEvidence.has(e.evidence))) return false;
    if (activeTypes.size > 0 && !activeTypes.has(e.kind)) return false;
    if (activeSourceKinds.size > 0 && (!e.sourceKind || !activeSourceKinds.has(e.sourceKind))) return false;
    if (!showExperimental.checked && e.entry?.experimental) return false;
    if (!q) return true;
    const haystack = `${e.id} ${e.title} ${e.summary} ${e.entry?.useWhen ?? ""} ${e.tags.join(" ")} ${e.entry?.requires?.join(" ") ?? ""}`.toLowerCase();
    return haystack.includes(q);
  });
}

function route(): { item?: Item; file?: string } {
  const [path = "", query = ""] = location.hash.slice(2).split("?");
  const [kind, id] = path.split("/");
  const item = items.find((e) => e.kind === kind && e.id === id);
  const primary = item?.files.find((f) => /\/(?:SCRIPT|WORKFLOW)\.md$/.test(f)) ?? item?.files[0];
  return { item, file: new URLSearchParams(query).get("file") ?? primary };
}

function link(text: string, href: string) {
  const a = el("a", text);
  a.href = href;
  a.target = "_blank";
  a.rel = "noreferrer";
  return a;
}

function kindBadge(kind: string, label = kind) {
  const badge = el("span", undefined, `badge badge-${kind}`);
  badge.append(catalogIcon(kind), document.createTextNode(label));
  return badge;
}

function renderControls() {
  const refresh = () => {
    renderControls();
    renderList();
  };

  const shown = visible();
  matchCount.textContent = `${shown.length}/${items.length}`;
  clearAllFiltersBtn.hidden = !hasFilters();
  clearInputBtn.hidden = input.value.length === 0;

  platformsBox.replaceChildren(...platformOptions.map((p) => chip(p, activePlatforms, refresh, platformLabels[p])));
  evidenceBox.replaceChildren(...evidenceTiers.map((ev) => chip(ev, activeEvidence, refresh)));

  sortCombo.refresh();
  filterCombo.refresh();
  renderTokens();
}

const sortLabels: Record<SortKey, string> = {
  score: "Score, grouped by completeness",
  name: "Name, A to Z",
  evidence: "Evidence, strongest first",
  reviewed: "Recently reviewed",
};
const sortShort: Record<SortKey, string> = { score: "Score", name: "Name", evidence: "Evidence", reviewed: "Recent" };
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function countBy(pick: (i: Item) => string | undefined, value: string) {
  return items.filter((i) => pick(i) === value).length;
}

const HIDE_EXPERIMENTAL = "hide-experimental";

const sortCombo = createCombobox({
  id: "sort",
  label: "Sort",
  multi: false,
  searchable: false,
  host: sidebarControls,
  options: () => (Object.keys(sorters) as SortKey[]).map((k) => ({ value: k, label: sortLabels[k] })),
  isSelected: (o) => o.value === sortKey,
  onSelect: (o) => {
    sortKey = o.value as SortKey;
    try {
      localStorage.setItem("catalog-sort", sortKey);
    } catch {}
    renderList();
  },
  summary: () => sortShort[sortKey],
});

const filterCombo = createCombobox({
  id: "filter",
  label: "Filter",
  multi: true,
  searchable: true,
  placeholder: "Filter by type or source…",
  host: sidebarControls,
  options: (): ComboOption[] => [
    ...typeOptions.map((t) => ({ value: `type:${t}`, label: kindLabels[t], group: "Type", count: countBy((i) => i.kind, t) })),
    ...sourceKinds.map((k) => ({ value: `source:${k}`, label: cap(k), group: "Source", count: countBy((i) => i.sourceKind, k) })),
    { value: HIDE_EXPERIMENTAL, label: "Hide experimental", group: "Show" },
  ],
  isSelected: (o) => {
    if (o.value === HIDE_EXPERIMENTAL) return !showExperimental.checked;
    const [group, v] = o.value.split(":");
    return (group === "type" ? activeTypes : activeSourceKinds).has(v);
  },
  onSelect: (o) => {
    if (o.value === HIDE_EXPERIMENTAL) {
      showExperimental.checked = !showExperimental.checked;
    } else {
      const [group, v] = o.value.split(":");
      const set = group === "type" ? activeTypes : activeSourceKinds;
      set.has(v) ? set.delete(v) : set.add(v);
    }
    renderControls();
    renderList();
  },
  summary: () => (sidebarFilterCount() === 0 ? "All" : ""),
  badge: sidebarFilterCount,
  onClear: () => {
    activeTypes.clear();
    activeSourceKinds.clear();
    showExperimental.checked = true;
    renderControls();
    renderList();
  },
});
comboRow.append(sortCombo.el, filterCombo.el);

function sidebarFilterCount() {
  return activeTypes.size + activeSourceKinds.size + (showExperimental.checked ? 0 : 1);
}

function renderTokens() {
  const tokens: { label: string; remove: () => void }[] = [
    ...[...activeTypes].map((t) => ({ label: kindLabels[t], remove: () => activeTypes.delete(t) })),
    ...[...activeSourceKinds].map((k) => ({ label: cap(k), remove: () => activeSourceKinds.delete(k) })),
    ...(showExperimental.checked ? [] : [{ label: "No experimental", remove: () => (showExperimental.checked = true) }]),
  ];
  filterTokens.hidden = tokens.length === 0;
  filterTokens.replaceChildren(
    ...tokens.map((t) => {
      const b = el("button", undefined, "filter-token");
      b.type = "button";
      b.title = `Remove ${t.label}`;
      b.setAttribute("aria-label", `Remove filter ${t.label}`);
      b.append(el("span", t.label), el("span", "×", "filter-token-x"));
      b.addEventListener("click", () => {
        t.remove();
        renderControls();
        renderList();
      });
      return b;
    }),
  );
}

// The sidebar dot: portable, Unix-only (macOS and Linux), or Windows-only.
function platformDot(item: Item) {
  const dot = el("span", undefined, "tree-dot");
  if (item.kind === "collection") {
    dot.className += " tree-dot-collection";
    dot.title = "Collection";
  } else if (!runsOn(item.platforms, "windows")) {
    dot.className += " tree-dot-unix";
    dot.title = item.platforms.map((p) => platformLabels[p]).join(", ");
  } else if (!runsOn(item.platforms, "macos") && !runsOn(item.platforms, "linux")) {
    dot.className += " tree-dot-windows";
    dot.title = "Windows";
  } else {
    dot.className += " tree-dot-any";
    dot.title = item.platforms.includes("any") ? "Any platform" : item.platforms.map((p) => platformLabels[p]).join(", ");
  }
  return dot;
}

function renderList() {
  const { item: current } = route();
  const openGroups = new Map([...list.querySelectorAll<HTMLDetailsElement>("details.tree-group")]
    .map((group) => [group.dataset.kind, group.open]));
  list.replaceChildren();
  const shown = visible();

  for (const kind of kinds) {
    const sorter = sorters[sortKey];
    const group = shown.filter((e) => treeGroup(e) === kind).sort((a, b) => sorter(a, b) || a.id.localeCompare(b.id));
    if (group.length === 0) continue;

    const details = el("details", undefined, "tree-group");
    details.dataset.kind = kind;
    details.open = openGroups.get(kind) ?? true;

    const summary = el("summary", undefined, "tree-group-summary");
    const chevron = el("span", "▸", "tree-chevron");
    const title = el("span", kindLabels[kind] ?? kind, "tree-group-title");
    const count = el("span", String(group.length), "tree-group-count");
    summary.append(chevron, catalogIcon(kind), title, count);
    details.append(summary);

    const treeItems = el("div", undefined, "tree-items");

    for (const item of group) {
      const a = el("a", undefined, "tree-item");
      a.href = `#/${item.kind}/${item.id}`;
      a.setAttribute("aria-current", String(item === current));
      a.title = `${item.title}\n${item.summary}`;
      a.append(platformDot(item), catalogIcon(item.kind), el("span", item.title, "tree-item-title"));

      if (item.entry) {
        const score = el("span", scoreLabel(item.entry), "tree-item-score");
        score.title = `${item.entry.rating.rubric}: curator judgment; inspect evidence and platform fit`;
        a.append(score);
      }
      treeItems.append(a);
    }

    details.append(treeItems);
    list.append(details);
  }

  if (shown.length === 0) {
    const empty = el("div", undefined, "empty-state");
    empty.style.padding = "2rem 1rem";
    empty.append(el("span", "🔍", "empty-icon"), el("p", "No matching entries found."));
    const resetBtn = el("button", "Reset filters", "btn-subtle");
    resetBtn.onclick = clearFilters;
    empty.append(resetBtn);
    list.append(empty);
  }
}

const REPO_URL = "https://github.com/alex-red/dev-catalog";
const RAW_BASE = "https://raw.githubusercontent.com/alex-red/dev-catalog/main";

// The platforms an install tab is offered for; "any" expands to all three.
function installPlatforms(e: CatalogEntry): Platform[] {
  return (["macos", "linux", "windows"] as const).filter((p) => runsOn(e.platforms, p));
}

function installSnippet(e: CatalogEntry, platform: Platform): { text: string; note?: string } {
  const custom = e.install?.[platform] ?? e.install?.any;
  const note = e.install?.notes;
  if (custom) return { text: custom, note };

  if (e.source.kind === "linked") {
    return { text: `# Follow the upstream install guide:\n# ${e.sourceUrl ?? e.source.url ?? "(no source URL)"}`, note };
  }
  // Commands fetch from the published repo, so they work without a local checkout.
  const raw = (path: string) => `${RAW_BASE}/${path}`;
  switch (e.type) {
    case "script": {
      // Everything except the documentation and licenses is installable, as in the install guide.
      const programs = e.files.filter((f) => !/\/(?:SCRIPT\.md|LICEN[CS]E[^/]*)$/i.test(f));
      if (platform === "windows") {
        return { text: `# Run under Git Bash or WSL; review each file first:\n${programs.map((f) => `curl -fsSL ${raw(f)} -O`).join("\n")}`, note };
      }
      const lines = ["mkdir -p ~/.local/bin"];
      for (const f of programs) {
        const name = f.split("/").pop()!;
        lines.push(`curl -fsSL ${raw(f)} -o ~/.local/bin/${name}`, `chmod +x ~/.local/bin/${name}`);
      }
      return { text: lines.join("\n"), note: note ?? "Read the script before running it, and check that ~/.local/bin is on your PATH." };
    }
    case "workflow":
      return { text: `# Read the workflow, then follow it:\ncurl -fsSL ${raw(`${e.path}/WORKFLOW.md`)}`, note };
    default:
      return { text: `# Copy files from ${e.path}`, note };
  }
}

function rubricMeter(r: Rating) {
  const box = el("div", undefined, "rubric-meter");
  const max = 4;
  for (const { key, label, weight } of rubricAxes) {
    const val = r.dimensions[key];
    const row = el("div", undefined, "rubric-row");
    row.append(el("span", `${label} · ${weight}%`, "rubric-label"));

    const track = el("div", undefined, "rubric-bar-track");
    const fill = el("div", undefined, "rubric-bar-fill");
    fill.style.width = `${((val ?? 0) / max) * 100}%`;
    track.append(fill);
    row.append(track);

    row.append(el("span", val === undefined ? "?" : `${val}/${max}`, "rubric-val"));
    box.append(row);
  }
  return box;
}

function copyForLlm(entry?: CatalogEntry, collection?: Collection, label = "Copy for LLM") {
  const button = el("button", label, "btn-action");
  button.type = "button";
  button.title = "Copy installation instructions to paste into your coding agent";
  button.onclick = async () => {
    const text = installPrompt({ revision: __CATALOG_REVISION__, entries: catalog.entries, entry, collection });
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "✓ Copied for LLM";
      setTimeout(() => (button.textContent = label), 1800);
    } catch {
      // Clipboard access can be denied or unavailable outside a secure context.
      const dialog = el("dialog", undefined, "dialog-modal");
      dialog.setAttribute("aria-label", "Copy instructions for LLM");
      const header = el("div", undefined, "dialog-header");
      const close = el("button", "×", "btn-dialog-close");
      close.type = "button";
      close.setAttribute("aria-label", "Close dialog");
      close.onclick = () => dialog.close();
      header.append(el("h2", "Copy for LLM"), close);
      const body = el("div", undefined, "llm-copy-body");
      const field = el("textarea", undefined, "llm-copy-text");
      field.value = text;
      field.readOnly = true;
      field.setAttribute("aria-label", "Installation instructions");
      body.append(el("p", "Clipboard access is unavailable. Copy these instructions and paste them into your coding agent."), field);
      dialog.append(header, body);
      dialog.addEventListener("close", () => dialog.remove(), { once: true });
      document.body.append(dialog);
      dialog.showModal();
      field.focus();
      field.select();
    }
  };
  return button;
}

function renderCollectionViewer(collection: Collection, activeFile?: string) {
  viewer.replaceChildren();
  viewer.scrollTop = 0;

  const header = el("div", undefined, "viewer-header");
  const titleRow = el("div", undefined, "viewer-title-row");
  const left = el("div", undefined, "viewer-title-left");

  const badges = el("div", undefined, "card-badges");
  badges.append(kindBadge("collection", "Collection"));
  left.append(badges, el("h2", collection.title));
  titleRow.append(left, copyForLlm(undefined, collection));
  header.append(titleRow);

  const desc = el("div", undefined, "callout-when");
  desc.append(el("div", "Collection Purpose", "callout-title"), el("p", collection.description, "callout-body"));

  viewer.append(header, desc);

  const memberSection = el("div", undefined, "inspector-card");
  memberSection.append(el("h4", `Curated Entries (${collection.entries.length})`));

  const grid = el("div", undefined, "collection-grid");
  for (const entryId of collection.entries) {
    const entryItem = items.find((i) => i.id === entryId && i.entry);
    if (!entryItem) continue;

    const card = el("a", undefined, "collection-member-card");
    card.href = `#/${entryItem.kind}/${entryItem.id}`;

    const top = el("div", undefined, "card-top");
    top.append(kindBadge(entryItem.kind));
    if (entryItem.entry) top.append(el("span", scoreLabel(entryItem.entry), "score-pill"));

    card.append(top, el("h4", entryItem.title), el("div", entryItem.summary, "card-summary"));
    grid.append(card);
  }
  memberSection.append(grid);
  viewer.append(memberSection);

  renderSourceViewer(collection.path, [collection.path], activeFile ?? collection.path);
}

// Swaps the visible source file in place; set by renderSourceViewer.
let showFile: ((file: string) => void) | undefined;

// Formats a YYYY-MM-DD date as a <time> element, read as UTC so it never shifts a day.
function dateEl(date: string, className?: string) {
  const time = el("time", new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { dateStyle: "medium", timeZone: "UTC" }), className);
  time.dateTime = date;
  return time;
}

// "Copied from upstream on <date> at <commit>" for vendored content; "Upstream read on …" for linked entries.
function retrievalNote(entry: CatalogEntry, className: string): HTMLElement | undefined {
  const { kind, retrieved, revision } = entry.source;
  if (!retrieved || (kind !== "vendored" && kind !== "linked")) return undefined;
  const note = el("p", undefined, className);
  note.append(kind === "vendored" ? "Copied from upstream on " : "Upstream read on ", dateEl(retrieved));
  if (revision) note.append(" at commit ", el("code", revision.slice(0, 7)));
  return note;
}

function renderSourceViewer(title: string, files: string[], activeFile: string, caption?: HTMLElement) {
  const fileSection = el("div", undefined, "file-viewer-section");
  fileSection.id = "entry-files";
  fileSection.tabIndex = -1;
  const tabsBar = el("div", undefined, "file-tabs-bar");
  const tabsList = el("div", undefined, "file-tabs-list");
  tabsList.setAttribute("role", "group");
  tabsList.setAttribute("aria-label", "Source files");
  const tabButtons = new Map<string, HTMLButtonElement>();

  for (const f of files) {
    const tabName = f.split("/").slice(3).join("/") || f.split("/").pop() || f;
    const tabBtn = el("button", tabName, "file-tab");
    tabBtn.type = "button";
    tabBtn.addEventListener("click", () => {
      const [path = ""] = location.hash.slice(2).split("?");
      location.hash = `#/${path}?file=${encodeURIComponent(f)}`;
    });
    tabButtons.set(f, tabBtn);
    tabsList.append(tabBtn);
  }

  const copyBtn = el("button", "📋 Copy to Clipboard", "btn-action");
  copyBtn.type = "button";
  tabsBar.append(tabsList, copyBtn);
  if (caption) fileSection.append(caption);

  const codeView = el("pre", "Loading…", "code-view");
  codeView.tabIndex = 0;
  codeView.setAttribute("aria-label", `${title} source content`);
  const fileStatus = el("p", undefined, "file-status");
  fileStatus.setAttribute("role", "status");
  const retryBtn = el("button", "Retry loading file", "btn-action");
  retryBtn.type = "button";
  retryBtn.hidden = true;
  fileSection.append(tabsBar, fileStatus, retryBtn, codeView);
  viewer.append(fileSection);

  let token = 0;
  showFile = (file) => {
    const mine = ++token;
    for (const [f, btn] of tabButtons) btn.setAttribute("aria-pressed", String(f === file));
    copyBtn.disabled = true;
    copyBtn.onclick = null;
    copyBtn.textContent = "Copy file";
    fileStatus.textContent = "Loading file…";
    codeView.textContent = "Loading…";
    codeView.setAttribute("aria-busy", "true");
    retryBtn.hidden = true;
    codeView.scrollTop = 0;
    const load = sources[file];
    if (!load) {
      codeView.textContent = `File content not found: ${file}`;
      codeView.setAttribute("aria-busy", "false");
      fileStatus.textContent = "This file is unavailable. Choose another source file above.";
      return;
    }
    void load().then((text) => {
      if (mine !== token) return;
      codeView.innerHTML = highlightSource(text, file);
      codeView.setAttribute("aria-busy", "false");
      copyBtn.disabled = false;
      fileStatus.textContent = "";
      copyBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(text);
          if (mine === token) fileStatus.textContent = "File copied to clipboard.";
        } catch {
          if (mine === token) fileStatus.textContent = "Clipboard unavailable. Select the source text below and copy it manually.";
        }
      };
    }).catch(() => {
      if (mine !== token) return;
      codeView.textContent = "File could not be loaded.";
      codeView.setAttribute("aria-busy", "false");
      fileStatus.textContent = "Check your connection and retry, or choose another file.";
      retryBtn.hidden = false;
      retryBtn.onclick = () => showFile?.(file);
    });
  };
  showFile(activeFile);
}

function metaRow(label: string, value: string | Node) {
  const row = el("div", undefined, "meta-row");
  const val = el("span", undefined, "meta-val");
  val.append(value);
  row.append(el("span", label, "meta-label"), val);
  return row;
}

async function renderViewer() {
  const { item, file } = route();
  viewer.replaceChildren();
  viewer.setAttribute("aria-label", item ? "Entry details" : "Catalog overview");
  $(".skip-link").textContent = item ? "Skip to entry details" : "Skip to catalog overview";

  if (!item) {
    viewer.scrollTop = 0;
    viewer.append(createLandingPage({
      entryCount: catalog.entries.length,
      collectionCount: catalog.collections.length,
      copyAction: copyForLlm(undefined, undefined, "Copy a prompt for your agent"),
      search: (query) => {
        clearFilters();
        input.value = query;
        input.dispatchEvent(new Event("input"));
      },
      openCommands: () => $("#command-toggle").click(),
    }));
    return;
  }

  if (item.collection) {
    renderCollectionViewer(item.collection, file);
    return;
  }

  viewer.scrollTop = 0;
  const entry = item.entry!;
  const currentFile = file ?? item.files[0];

  // Header & Action Bar
  const header = el("div", undefined, "viewer-header");
  const titleRow = el("div", undefined, "viewer-title-row");
  const left = el("div", undefined, "viewer-title-left");

  const badges = el("div", undefined, "card-badges");
  badges.append(kindBadge(entry.type));
  if (entry.experimental) badges.append(kindBadge("experimental", "Experimental"));
  for (const p of entry.platforms) badges.append(el("span", platformLabels[p] ?? p, `badge badge-platform-${p}`));
  badges.append(el("span", entry.rating.evidence, `badge badge-ev-${entry.rating.evidence}`));
  badges.append(el("span", scoreLabel(entry), "score-pill"));

  left.append(badges, el("h2", entry.title), el("p", entry.summary, "rating-context"));
  const retrieval = retrievalNote(entry, "viewer-retrieved");
  if (retrieval) left.append(retrieval);
  titleRow.append(left);

  const actions = el("div", undefined, "viewer-actions");
  actions.append(copyForLlm(entry));
  if (entry.sourceUrl) {
    const onGithub = entry.sourceUrl.startsWith("https://github.com/");
    const upstream = el("a", undefined, "btn-source");
    if (onGithub) {
      // GitHub mark, inline so it follows the button's text color.
      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("viewBox", "0 0 16 16");
      icon.setAttribute("aria-hidden", "true");
      const mark = document.createElementNS("http://www.w3.org/2000/svg", "path");
      mark.setAttribute("fill", "currentColor");
      mark.setAttribute("d", "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z");
      icon.append(mark);
      upstream.append(icon);
    }
    upstream.append(onGithub ? "View source on GitHub" : "View source", el("span", "↗", "btn-source-arrow"));
    upstream.title = entry.sourceUrl;
    upstream.href = entry.sourceUrl;
    upstream.target = "_blank";
    upstream.rel = "noreferrer";
    actions.append(upstream);
  }
  titleRow.append(actions);
  header.append(titleRow);
  const sections = el("div", undefined, "section-shortcuts");
  sections.setAttribute("role", "group");
  sections.setAttribute("aria-label", "Jump to entry section");
  for (const [id, label] of [["entry-install", "Installation"], ["entry-files", "Source files"], ["entry-review", "Ratings & provenance"]]) {
    const jump = el("button", `${label} ↓`, "btn-subtle");
    jump.type = "button";
    jump.onclick = () => {
      const target = document.getElementById(id);
      target?.scrollIntoView({ block: "start" });
      target?.focus({ preventScroll: true });
    };
    sections.append(jump);
  }
  header.append(sections);
  viewer.append(header);

  if (entry.useWhen) {
    const whenBox = el("div", undefined, "callout-when");
    whenBox.append(el("div", "When to Use", "callout-title"), el("p", entry.useWhen, "callout-body"));
    viewer.append(whenBox);
  }

  // Curation & Rubric Grid
  const grid = el("div", undefined, "inspector-grid");
  grid.id = "entry-review";
  grid.tabIndex = -1;

  const rubricCard = el("div", undefined, "inspector-card");
  rubricCard.append(el("h4", "Curator rating · dev-v1"));
  rubricCard.append(el("p", "Seven grades from 0 to 4; higher is better. A curator judgment, not a measurement. Evidence and platform fit are separate.", "rating-context"));
  rubricCard.append(link("How ratings work", `${REPO_URL}/blob/main/docs/ratings.md`));
  rubricCard.append(rubricMeter(entry.rating));

  if (entry.rating.notes) {
    const notesBox = el("div", undefined, "review-notes");
    notesBox.append(el("strong", "Reviewer notes: "), document.createTextNode(entry.rating.notes));
    rubricCard.append(notesBox);
  }
  if (entry.rating.review) rubricCard.append(link("Read the assessment and its limits", `${REPO_URL}/blob/main/${entry.rating.review}`));
  if (entry.rating.unknowns?.length) rubricCard.append(el("p", `Unknowns: ${entry.rating.unknowns.join("; ")}`, "review-notes"));
  for (const blocker of entry.rating.blockers ?? []) {
    const notice = el("div", undefined, "rating-blocker");
    notice.append(el("strong", `Recommendation blocker · ${blocker.scope}: `), document.createTextNode(blocker.reason));
    rubricCard.append(notice);
  }
  grid.append(rubricCard);

  // Provenance & Requirements Card
  const provCard = el("div", undefined, "inspector-card");
  provCard.append(el("h4", "Provenance & Requirements"));

  const sourceVal = el("span", `${entry.source.kind} · ${entry.source.license}${entry.source.author ? ` · ${entry.source.author}` : ""}${entry.source.version ? ` · v${entry.source.version}` : ""}`);
  if (entry.sourceUrl) {
    // Short label: owner/repo/path @ revision for pinned GitHub sources, else host and path.
    const { url, path, revision } = entry.source;
    const label = url && entry.sourceUrl.startsWith(url) && url.startsWith("https://github.com/")
      ? `${url.slice("https://github.com/".length)}${path ? `/${path}` : ""}${revision ? ` @ ${revision.slice(0, 7)}` : ""}`
      : entry.sourceUrl.replace(/^https:\/\/(?:www\.)?/, "");
    sourceVal.append(" · ", link(label, entry.sourceUrl));
  }
  provCard.append(metaRow("Source & License", sourceVal));
  provCard.append(metaRow("Platforms", entry.platforms.map((p) => platformLabels[p] ?? p).join(", ")));
  if (entry.requires?.length) provCard.append(metaRow("Requires", entry.requires.join(", ")));
  if (entry.source.retrieved) provCard.append(metaRow(entry.source.kind === "vendored" ? "Copied" : "Upstream Read", dateEl(entry.source.retrieved)));
  if (entry.overlap) provCard.append(metaRow("Overlap", entry.overlap));

  if (entry.evidence?.length) {
    const evidenceVal = el("span");
    entry.evidence.forEach((path, i) => {
      if (i > 0) evidenceVal.append(", ");
      evidenceVal.append(link(path, `${REPO_URL}/blob/main/${path}`));
    });
    provCard.append(metaRow("Evidence", evidenceVal));
  }

  if (entry.inspiredBy?.length) {
    const inspVal = el("span");
    entry.inspiredBy.forEach(({ title, url }, i) => {
      if (i > 0) inspVal.append(", ");
      inspVal.append(link(title, url));
    });
    provCard.append(metaRow("Inspired By", inspVal));
  }

  if (entry.related?.length) {
    const chips = el("div", undefined, "related-chips");
    for (const relId of entry.related) {
      const relItem = items.find((i) => i.id === relId);
      const chipLink = el("a", relItem?.title ?? relId, "related-chip");
      chipLink.href = relItem ? `#/${relItem.kind}/${relItem.id}` : `#`;
      chips.append(chipLink);
    }
    provCard.append(metaRow("Related", chips));
  }

  grid.append(provCard);
  viewer.append(grid);

  // How to Install & Use Snippet Card
  const installCard = el("div", undefined, "install-card");
  installCard.id = "entry-install";
  installCard.tabIndex = -1;
  const installHead = el("div", undefined, "install-header");
  installHead.append(el("h4", "How to Install / Use"));

  const platforms = installPlatforms(entry);
  const installTabs = el("div", undefined, "install-tabs");
  installTabs.setAttribute("role", "group");
  installTabs.setAttribute("aria-label", "Installation platform");
  const tabs = new Map<Platform, HTMLButtonElement>(platforms.map((p) => [p, el("button", platformLabels[p], "install-tab-btn")]));
  installTabs.append(...tabs.values());
  installHead.append(installTabs);
  installCard.append(installHead);

  const snippetBox = el("div", undefined, "code-snippet-box");
  const snippetText = el("code", undefined, "code-snippet-text");
  snippetText.tabIndex = 0;
  snippetText.setAttribute("role", "region");
  snippetText.setAttribute("aria-label", "Installation commands, scroll horizontally for long lines");
  const copySnippetBtn = el("button", "Copy", "btn-snippet-copy");
  copySnippetBtn.onclick = async () => {
    await navigator.clipboard.writeText(snippetText.textContent ?? "");
    copySnippetBtn.textContent = "✓ Copied";
    setTimeout(() => (copySnippetBtn.textContent = "Copy"), 1200);
  };

  const noteBox = el("div", undefined, "meta-val");
  noteBox.style.fontSize = "0.75rem";
  noteBox.style.color = "var(--text-muted)";

  const updateSnippet = (platform: Platform) => {
    for (const [p, tab] of tabs) tab.setAttribute("aria-pressed", String(p === platform));
    const updated = installSnippet(entry, platform);
    snippetText.textContent = updated.text;
    noteBox.textContent = updated.note ? `Note: ${updated.note}` : "";
    noteBox.hidden = !updated.note;
  };
  for (const [p, tab] of tabs) tab.onclick = () => updateSnippet(p);
  // Start on the viewer's own platform when the entry supports it.
  const own: Platform = /Win/.test(navigator.platform) ? "windows" : /Mac/.test(navigator.platform) ? "macos" : "linux";
  updateSnippet(platforms.includes(own) ? own : platforms[0]);

  snippetBox.append(snippetText, copySnippetBtn);
  installCard.append(snippetBox, noteBox);
  viewer.append(installCard);

  // Only vendored entries display upstream text in the file viewer, so only they get the copy date there.
  const caption = entry.source.kind === "vendored" ? retrievalNote(entry, "file-retrieved") : undefined;
  renderSourceViewer(entry.title, item.files, currentFile, caption);
}

let lastPath: string | undefined;

function sync() {
  const [path = ""] = location.hash.slice(2).split("?");
  // Only the ?file= changed: swap the file in place so the page doesn't flash or jump.
  if (path === lastPath && showFile && viewer.querySelector(".file-viewer-section")) {
    const { file } = route();
    if (file) showFile(file);
    return;
  }
  lastPath = path;
  showFile = undefined;
  renderList();
  void renderViewer();
}

input.addEventListener("input", () => {
  if (narrowLayout.matches) setCatalogExpanded(true);
  clearInputBtn.hidden = input.value.length === 0;
  renderControls();
  renderList();
});

clearInputBtn.addEventListener("click", () => {
  input.value = "";
  clearInputBtn.hidden = true;
  input.focus();
  renderControls();
  renderList();
});

clearAllFiltersBtn.addEventListener("click", clearFilters);

window.addEventListener("hashchange", sync);

window.addEventListener("keydown", (e) => {
  if ((e.target as Element | null)?.closest?.("#command-palette")) return;
  if ((e.target as Element | null)?.closest?.(".combo, .combo-pop")) return;
  const typing = !!(e.target as Element | null)?.closest?.("input, textarea, select, [contenteditable]:not([contenteditable='false'])");
  if (e.key === "/" && !typing) {
    e.preventDefault();
    input.focus();
  } else if (e.key === "Escape") {
    if (introDialog.open) {
      introDialog.close();
    } else if (typing) {
      input.blur();
    } else {
      clearFilters();
    }
  } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !typing &&
    (e.target === document.body || list.contains(e.target as Node))) {
    const shown = [...list.querySelectorAll<HTMLAnchorElement>("a.tree-item")];
    const i = shown.findIndex((a) => a.getAttribute("aria-current") === "true");
    const next = shown[Math.min(shown.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))];
    if (next) {
      e.preventDefault();
      location.hash = next.hash;
    }
  }
});

introToggle.addEventListener("click", () => introDialog.showModal());
introClose.addEventListener("click", () => introDialog.close());
introDialog.addEventListener("click", (e) => {
  if (e.target === introDialog) introDialog.close();
});

let allFolded = false;
treeToggleAllBtn.addEventListener("click", () => {
  allFolded = !allFolded;
  const groups = list.querySelectorAll<HTMLDetailsElement>("details.tree-group");
  for (const g of groups) g.open = !allFolded;
  treeToggleAllBtn.textContent = allFolded ? "Unfold all" : "Fold all";
});

$("#counts").textContent = `${catalog.entries.length}`;

// Global navigation searches all items independently of the sidebar's filters.
const scorePriorities = new Map([...items].sort(sorters.score).map((item, index) => [item.id, (items.length - index) / items.length]));
const itemCommands: SearchCommand[] = items.map((item) => ({
  id: `open:${item.kind}:${item.id}`,
  title: item.title,
  detail: `${kindLabels[item.kind]} · ${item.summary}`,
  group: item.kind === "collection" ? "Collections" : "Catalog entries",
  keywords: `${item.id} ${item.tags.join(" ")} ${item.platforms.join(" ")} ${item.entry?.useWhen ?? ""}`,
  priority: scorePriorities.get(item.id) ?? 0,
  run: () => { location.hash = `#/${item.kind}/${item.id}`; },
}));

function paletteActions(): SearchCommand[] {
  const action = (id: string, title: string, detail: string, run: () => void): SearchCommand => ({
    id, title, detail, group: "Quick actions", priority: 10, run,
  });
  return [
    action("overview", "Go to catalog overview", "Explore the catalog", () => { location.hash = ""; }),
    action("reset", "Reset all filters", "Show the full catalog again", clearFilters),
    ...platformOptions.map((platform) => action(`platform:${platform}`, `Browse for ${platformLabels[platform]}`,
      "Show entries that run on this platform, including portable ones", () => {
        clearFilters();
        activePlatforms.add(platform);
        renderControls();
        renderList();
      })),
    action("about", "About Dev Catalog", "Ratings, evidence levels and keyboard shortcuts", () => introDialog.showModal()),
  ];
}

createCommandPalette({
  trigger: $<HTMLButtonElement>("#command-toggle"),
  commands: () => [...paletteActions(), ...itemCommands],
  defaults: () => [
    ...paletteActions(),
    ...items.filter((item) => item.entry && !item.entry.experimental)
      .sort(sorters.score).slice(0, 4)
      .flatMap((item) => itemCommands.filter((command) => command.id === `open:${item.kind}:${item.id}`))
      .map((command) => ({ ...command, group: "Top-rated entries" })),
  ],
});

renderControls();
sync();
