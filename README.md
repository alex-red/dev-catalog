# Dev Catalog

[![Validate](https://github.com/alex-red/dev-catalog/actions/workflows/validate.yml/badge.svg)](https://github.com/alex-red/dev-catalog/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A curated, rated catalog of useful developer scripts, tools, and workflows. Every entry records what it is for, the platforms it runs on, what it needs installed, where it came from, and an honest curator rating.

**Status: experimental.** The catalog is new and small. See [the plan](PLAN.md).

## Use it from an agent

Point a coding agent at the catalog and say what you want:

> Find something in the Dev Catalog to clean up my merged Git branches.
>
> What does the Dev Catalog have for tracking down a regression?

Any agent can read the ranked index directly:

```text
https://raw.githubusercontent.com/alex-red/dev-catalog/main/llms.txt
```

For a guided flow, install the `dev-catalog` skill. It checks your platform and what you already have, recommends a few entries with their scores and sources, and installs only what you approve.

```sh
# Claude Code
claude plugin marketplace add alex-red/dev-catalog
claude plugin install dev-catalog@dev-catalog

# Codex
codex plugin marketplace add alex-red/dev-catalog
codex plugin add dev-catalog@dev-catalog
```

Or copy `skills/dev-catalog/` into `.claude/skills/` or `.agents/skills/`.

## Use it by hand

Browse [`entries/`](entries/), or read [llms.txt](llms.txt) for the ranked list. To install a script, copy it onto your `PATH`:

```sh
install -m 0755 entries/scripts/git-prune-merged/git-prune-merged ~/.local/bin/
```

## What an entry contains

Each entry lives in `entries/<type>s/<id>/` with an `entry.yaml` and, unless it is linked, the files to use:

| Type | What it is | Contents |
| --- | --- | --- |
| `script` | A small program you copy onto your `PATH` | `SCRIPT.md` plus the script files |
| `workflow` | A procedure built from existing tools | `WORKFLOW.md` |
| `tool` | A third-party program you install | Always linked: `entry.yaml` only, with install steps per platform |

Every entry has:

- **Rating:** the [dev-v1 rubric](docs/ratings.md) grades practical value, dependability, ease of use, safety and control, adoption cost, portability, and upkeep from 0 to 4, giving a weighted score out of 10. A missing grade means no score, and blockers outrank scores.
- **Evidence:** `reviewed` (read and judged), `used` (used in real work), or `tested` (automated checks in this repository).
- **Source:** `original`, `adapted` (with `inspiredBy` links), `vendored` (a pinned, unmodified upstream copy with its license), or `linked` (upstream only, pinned to a revision).
- **Platforms, requirements, tags, `useWhen`, `overlap`, and `related` entries**, for matching and comparison.

Optional collections (`collections/<id>.yaml`) group entries that work well together.

## Develop

```sh
bun install
bun run check           # typecheck, lint, schema validation, generated-file freshness, tests
bun run catalog:build   # regenerate catalog/index.json and llms.txt after changing entries
bun run plugin:validate # needs the Claude Code CLI
```

Read [CONTRIBUTING.md](CONTRIBUTING.md) before adding an entry, and [decisions](docs/decisions.md) for why the catalog is shaped this way.

Original and adapted content is MIT licensed. Vendored entries keep their upstream licenses, shipped alongside them.
