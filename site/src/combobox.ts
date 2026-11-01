export interface ComboOption {
  value: string;
  label: string;
  group?: string;
  count?: number;
}

export interface ComboConfig {
  id: string;
  label: string;
  multi: boolean;
  searchable: boolean;
  placeholder?: string;
  /** Element the popover is positioned against and appended to. */
  host: HTMLElement;
  options: () => ComboOption[];
  isSelected: (o: ComboOption) => boolean;
  onSelect: (o: ComboOption) => void;
  /** Text shown in the trigger after the label. */
  summary: () => string;
  /** Count badge on the trigger (multi-select filters). */
  badge?: () => number;
  onClear?: () => void;
}

function h<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** Compact combobox: a trigger button plus a popover listbox with optional search and keyboard support. */
export function createCombobox(cfg: ComboConfig) {
  const root = h("div", "combo");
  const trigger = h("button", "combo-trigger");
  trigger.type = "button";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  const triggerLabel = h("span", "combo-trigger-label", cfg.label);
  const triggerValue = h("span", "combo-trigger-value");
  const triggerBadge = h("span", "combo-badge");
  const chevron = h("span", "combo-chevron", "▾");
  chevron.setAttribute("aria-hidden", "true");
  trigger.append(triggerLabel, triggerValue, triggerBadge, chevron);
  root.append(trigger);

  const pop = h("div", "combo-pop");
  pop.hidden = true;
  const search = h("input", "combo-search");
  search.type = "text";
  search.placeholder = cfg.placeholder ?? "Filter…";
  search.autocomplete = "off";
  search.setAttribute("aria-label", `${cfg.label} options`);
  const listbox = h("div", "combo-list");
  listbox.id = `${cfg.id}-list`;
  listbox.setAttribute("role", "listbox");
  listbox.setAttribute("aria-label", cfg.label);
  if (cfg.multi) listbox.setAttribute("aria-multiselectable", "true");
  const footer = h("div", "combo-footer");
  const clearBtn = h("button", "combo-clear", "Clear all");
  clearBtn.type = "button";
  footer.append(clearBtn);
  if (cfg.searchable) pop.append(search);
  pop.append(listbox);
  if (cfg.onClear) pop.append(footer);
  cfg.host.append(pop);

  // Focus target for keyboard handling: the search box, or the listbox itself.
  const keyTarget: HTMLElement = cfg.searchable ? search : listbox;
  if (!cfg.searchable) listbox.tabIndex = 0;

  let open = false;
  let shown: ComboOption[] = [];
  let activeIndex = 0;

  const optId = (i: number) => `${cfg.id}-opt-${i}`;

  function setActive(i: number, scroll = true) {
    if (shown.length === 0) return;
    activeIndex = (i + shown.length) % shown.length;
    listbox.querySelectorAll<HTMLElement>("[role=option]").forEach((n, idx) => {
      n.classList.toggle("is-active", idx === activeIndex);
    });
    keyTarget.setAttribute("aria-activedescendant", optId(activeIndex));
    if (scroll) document.getElementById(optId(activeIndex))?.scrollIntoView({ block: "nearest" });
  }

  function renderList() {
    const q = search.value.trim().toLowerCase();
    const prevScroll = listbox.scrollTop;
    shown = cfg.options().filter((o) => !q || o.label.toLowerCase().includes(q));
    listbox.replaceChildren();
    if (shown.length === 0) {
      listbox.append(h("div", "combo-empty", "No matches"));
      return;
    }
    let lastGroup: string | undefined;
    shown.forEach((o, i) => {
      if (o.group && o.group !== lastGroup) {
        const g = h("div", "combo-group", o.group);
        g.setAttribute("role", "presentation");
        listbox.append(g);
      }
      lastGroup = o.group;
      const selected = cfg.isSelected(o);
      const row = h("div", "combo-option");
      row.id = optId(i);
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(selected));
      const mark = h("span", cfg.multi ? "combo-check" : "combo-dot", selected ? (cfg.multi ? "✓" : "●") : "");
      mark.setAttribute("aria-hidden", "true");
      row.append(mark, h("span", "combo-option-label", o.label));
      if (o.count !== undefined) row.append(h("span", "combo-option-count", String(o.count)));
      // Keep focus in the search box / listbox while clicking.
      row.addEventListener("mousedown", (e) => e.preventDefault());
      row.addEventListener("mousemove", () => {
        if (activeIndex !== i) setActive(i, false);
      });
      row.addEventListener("click", () => choose(i));
      listbox.append(row);
    });
    listbox.scrollTop = prevScroll;
    setActive(Math.min(activeIndex, shown.length - 1), false);
  }

  function choose(i: number) {
    const o = shown[i];
    if (!o) return;
    cfg.onSelect(o);
    refresh();
    if (!cfg.multi) close(true);
  }

  function refresh() {
    triggerValue.textContent = cfg.summary();
    const n = cfg.badge?.() ?? 0;
    triggerBadge.textContent = String(n);
    triggerBadge.hidden = n === 0;
    trigger.classList.toggle("is-active", n > 0);
    clearBtn.hidden = n === 0;
    if (open) renderList();
  }

  function openPop() {
    if (open) return;
    closeOthers();
    open = true;
    pop.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    search.value = "";
    shown = cfg.options();
    // Start on the selected option for single-select, else the first.
    const sel = shown.findIndex((o) => cfg.isSelected(o));
    activeIndex = !cfg.multi && sel >= 0 ? sel : 0;
    renderList();
    setActive(activeIndex);
    keyTarget.focus({ preventScroll: true });
  }

  function close(returnFocus: boolean) {
    if (!open) return;
    open = false;
    pop.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    keyTarget.removeAttribute("aria-activedescendant");
    if (returnFocus) trigger.focus({ preventScroll: true });
  }

  trigger.addEventListener("click", () => (open ? close(false) : openPop()));
  trigger.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      openPop();
    }
  });

  search.addEventListener("input", () => {
    activeIndex = 0;
    renderList();
    setActive(0);
  });

  keyTarget.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive(activeIndex + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive(activeIndex - 1);
        break;
      case "Home":
        if (!cfg.searchable) {
          e.preventDefault();
          setActive(0);
        }
        break;
      case "End":
        if (!cfg.searchable) {
          e.preventDefault();
          setActive(shown.length - 1);
        }
        break;
      case "Enter":
        e.preventDefault();
        choose(activeIndex);
        break;
      case " ":
        if (!cfg.searchable || search.value === "") {
          e.preventDefault();
          choose(activeIndex);
        }
        break;
      case "Escape":
        e.preventDefault();
        if (search.value) {
          search.value = "";
          renderList();
        } else {
          close(true);
        }
        break;
      case "Tab":
        close(false);
        return;
      default:
        return;
    }
    e.stopPropagation();
  });

  clearBtn.addEventListener("mousedown", (e) => e.preventDefault());
  clearBtn.addEventListener("click", () => {
    cfg.onClear?.();
    refresh();
    keyTarget.focus({ preventScroll: true });
  });

  document.addEventListener("pointerdown", (e) => {
    if (open && !root.contains(e.target as Node) && !pop.contains(e.target as Node)) close(false);
  });

  const instance = { el: root, refresh, close: () => close(false) };
  registry.push(instance);
  function closeOthers() {
    for (const c of registry) if (c !== instance) c.close();
  }

  refresh();
  return instance;
}

const registry: { close: () => void }[] = [];
