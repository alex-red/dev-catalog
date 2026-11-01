# Dev Catalog

[![Validate](https://github.com/alex-red/dev-catalog/actions/workflows/validate.yml/badge.svg)](https://github.com/alex-red/dev-catalog/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A small, curated catalog of developer scripts, tools, and workflows that are worth keeping around. Each entry says when to reach for it, which platforms it runs on, what it needs, where it came from, and how it rates against what you already have.

Browse it at [alex-red.github.io/dev-catalog](https://alex-red.github.io/dev-catalog/), or run `bun run dev` for a local copy that reloads as entries change.

**Status: experimental.** The catalog is just getting started. See [the plan](PLAN.md) for what comes next.

## What's in it

- **Scripts** are small programs you copy onto your `PATH`. Anything that changes state does a dry run unless you pass a flag.
- **Workflows** are step-by-step methods built from tools you already have.
- **Tools** are third-party programs, linked to their upstream project with install commands for each platform.

<!-- catalog:entries:start -->

### Scripts

| Entry | Use it when | Platforms | Score |
| --- | --- | --- | --- |
| [Prune merged local Git branches](entries/scripts/git-prune-merged/SCRIPT.md) | Local branches have piled up after merged pull requests and you want to clear the ones that are safely merged without guessing. | macos, linux | 8.6/10 |

### Workflows

| Entry | Use it when | Platforms | Score |
| --- | --- | --- | --- |
| [Find a regression with git bisect run](entries/workflows/git-bisect-regression/WORKFLOW.md) | Something worked in an older version and fails now, and reading recent diffs has not shown the cause. | any | 9.1/10 |

### Tools

| Entry | Use it when | Platforms | Score |
| --- | --- | --- | --- |
| [ripgrep (rg) recursive search](https://github.com/BurntSushi/ripgrep) | You search codebases from the terminal and grep -r is slow or noisy with build output, vendored dependencies, or ignored files. | macos, linux, windows | 9.3/10 |

<!-- catalog:entries:end -->

Scores are out of 10, from a curator's review against the built-in or usual alternative. They are judgments, not benchmarks; see [how entries are rated](docs/ratings.md).

## Get a script

Read the script first; each one has a `SCRIPT.md` with usage and limitations. Then download it onto your `PATH`:

```sh
curl -fsSL https://raw.githubusercontent.com/alex-red/dev-catalog/main/entries/scripts/git-prune-merged/git-prune-merged \
  -o ~/.local/bin/git-prune-merged
chmod +x ~/.local/bin/git-prune-merged
```

Or clone the repository and install from it:

```sh
git clone https://github.com/alex-red/dev-catalog.git
install -m 0755 dev-catalog/entries/scripts/git-prune-merged/git-prune-merged ~/.local/bin/
```

Tools list their install commands in their `entry.yaml`. Workflows need nothing installed.

## Ask an agent

A coding agent can search the catalog for you:

> Find something in the Dev Catalog to clean up my merged Git branches.

Agents can read the ranked index at `https://raw.githubusercontent.com/alex-red/dev-catalog/main/llms.txt`. For a guided flow, install the `dev-catalog` skill, which checks your platform and what you already have, recommends a few entries, and installs only what you approve:

```sh
claude plugin marketplace add alex-red/dev-catalog
claude plugin install dev-catalog@dev-catalog
```

Or copy `skills/dev-catalog/` into `.claude/skills/` or `.agents/skills/` for other agents.

## Contribute

Suggest an entry with an [entry proposal](https://github.com/alex-red/dev-catalog/issues/new?template=entry-proposal.yml), or add one directly by following [CONTRIBUTING.md](CONTRIBUTING.md). To work on the catalog:

```sh
bun install
bun run check           # typecheck, lint, schema validation, generated-file freshness, tests
bun run catalog:build   # regenerate the entry table above, catalog/index.json, and llms.txt
```

[Decisions](docs/decisions.md) explains why the catalog is shaped the way it is.

## License

Original content is MIT licensed. Vendored entries keep their upstream licenses, shipped alongside them, and linked tools are licensed by their own projects.
