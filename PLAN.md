# Plan

Updated: October 31, 2026
Status: experimental. The catalog has three entries, one of each type, which exist to exercise the format end to end.

Decisions and their reasons live in [docs/decisions.md](docs/decisions.md).

## Product

Dev Catalog is a curated, rated catalog of useful developer scripts, tools, and workflows. The goal is that a person can browse it, or tell an agent "find something in the Dev Catalog for X", and get a small number of trustworthy recommendations with their source, license, platform support, and requirements recorded, plus a clear way to install them.

It is a sibling of [Agentic Catalog](https://github.com/alex-red/agentic-catalog), which covers agent guidance (skills, rules, hooks). Dev Catalog covers the developer's own toolbox. An item that is mainly instructions for an agent belongs there; an item a developer runs or follows belongs here.

## How it is used

- `llms.txt`: a ranked, one-line-per-entry index that can be read in a single fetch.
- `catalog/index.json`: full metadata for filtering.
- The `dev-catalog` skill, the only thing the plugin ships. It reads the index, checks the user's platform and installed tools, recommends a few entries, and installs only the approved ones.

The index and `llms.txt` are generated from `entries/` and `collections/` and checked for freshness in CI.

## Curation rules

1. Prefer fit and quality over coverage. An entry must be the best available option for its job, or a clearly labelled alternative.
2. Grade value against what is already available: built-in commands and widely installed tools. Record that in `overlap`.
3. Scripts are dry-run or read-only by default, pass `shellcheck`, and have a test before they are rated `tested`.
4. Tools are always linked, never vendored, and pinned to a release.
5. Read everything before vendoring. Vendor only permissive licenses, keep the upstream license file, pin the commit, and do not edit vendored files.
6. Re-review entries when upstream releases a major version, or at least every six months.

## Next steps

1. **Seed the catalog.** Add ten to twenty high-value entries across Git, search and navigation, shell productivity, containers, and release tooling. Start with what you already use daily.
2. **Publish.** Push to `alex-red/dev-catalog`, check the plugin installs from a fresh session in Claude Code and Codex, and tag `v0.1.0`.
3. **Collections.** Once there are enough entries, add a few, such as `git-hygiene` or `new-machine`.
4. **Freshness.** Add a script that reports linked tools whose upstream has a newer release than the pinned `version`.
5. **Browser.** A static site on GitHub Pages, once there are enough entries to need search.

## Out of scope until evidence asks for it

A general-purpose installer CLI, implicit installation of anything, dotfile management, and per-entry versioning beyond pinned upstream revisions.
