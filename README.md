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
| [Reclaim disk space from developer caches and build output](entries/scripts/disk-reclaim/SCRIPT.md) | A development machine is running low on disk and you want to see which caches, node_modules, build outputs and leftovers are worth clearing before deleting anything. | macos, linux | 8.4/10 |

### Workflows

| Entry | Use it when | Platforms | Score |
| --- | --- | --- | --- |
| [Work on parallel Git branches with worktrees](entries/workflows/git-worktree-parallel/WORKFLOW.md) | You need another branch checked out alongside work in progress, especially when switching branches would interrupt a dev server or trigger a rebuild. | any | 9.6/10 |
| [Find a regression with git bisect run](entries/workflows/git-bisect-regression/WORKFLOW.md) | Something worked in an older version and fails now, and reading recent diffs has not shown the cause. | any | 9.1/10 |
| [Diagnose failed CI browser tests with Playwright traces](entries/workflows/playwright-ci-traces/WORKFLOW.md) | A Playwright test fails in CI and screenshots or logs alone do not explain what happened. | macos, linux, windows | 8.8/10 |

### Tools

| Entry | Use it when | Platforms | Score |
| --- | --- | --- | --- |
| [fd for finding files by name](https://github.com/sharkdp/fd) | You search for paths in source trees or need a file list for a picker, watcher, or another command. | macos, linux, windows | 10.0/10 |
| [ShellCheck static analysis for shell scripts](https://github.com/koalaman/shellcheck) | You maintain Bash or POSIX shell scripts and want actionable diagnostics before local runs or CI. | macos, linux, windows | 10.0/10 |
| [fzf fuzzy finder](https://github.com/junegunn/fzf) | You repeatedly scroll through shell history, navigate long lists, or write shell helpers that need a keyboard-driven picker. | macos, linux, windows | 9.6/10 |
| [jq for querying and transforming JSON](https://github.com/jqlang/jq) | You repeatedly extract fields from API responses, CLI output, or JSON logs and want a reusable command. | macos, linux, windows | 9.6/10 |
| [Ruff Python linter and formatter](https://github.com/astral-sh/ruff) | You maintain Python repos and want consistent linting and formatting with one command-line tool. | macos, linux, windows | 9.6/10 |
| [GitHub CLI for pull requests and Actions](https://github.com/cli/cli) | You review GitHub pull requests or investigate Actions failures often and want commands you can run in the active checkout. | macos, linux, windows | 9.4/10 |
| [Hurl repeatable HTTP requests and assertions](https://github.com/Orange-OpenSource/hurl) | You repeat a multi-step API check such as signing in, using a captured token, and asserting the next response. | macos, linux, windows | 9.3/10 |
| [Hyperfine benchmarks for command-line programs](https://github.com/sharkdp/hyperfine) | You want to know whether a change improved a build, test command, or CLI before making it the default. | macos, linux, windows | 9.3/10 |
| [ripgrep (rg) recursive search](https://github.com/BurntSushi/ripgrep) | You search codebases from the terminal and grep -r is slow or noisy with build output, vendored dependencies, or ignored files. | macos, linux, windows | 9.3/10 |
| [uv Python project and dependency manager](https://github.com/astral-sh/uv) | You maintain Python projects or standalone scripts and regularly spend time setting up interpreters, virtual environments, and dependencies. | macos, linux, windows | 9.1/10 |
| [zoxide for jumping to familiar directories](https://github.com/ajeetdsouza/zoxide) | You switch among many repos or deeply nested project directories from the shell. | macos, linux, windows | 9.1/10 |
| [delta syntax-highlighting diff pager](https://github.com/dandavison/delta) | You regularly review patches in a terminal and want to spot small changes in dense diffs. | macos, linux, windows | 8.9/10 |
| [Dive for inspecting container image layers](https://github.com/wagoodman/dive) | An image grew unexpectedly or you need to trace a file back to the build layer that introduced it. | macos, linux, windows | 8.8/10 |
| [DuckDB CLI for local data inspection](https://github.com/duckdb/duckdb) | You regularly inspect data exports, compare before-and-after snapshots, or check fixtures and already know enough SQL to express the question. | macos, linux, windows | 8.8/10 |
| [just project command runner](https://github.com/casey/just) | Contributors keep looking up setup, test, or maintenance commands and need a small shared command menu. | macos, linux, windows | 8.8/10 |
| [Mike Farah's yq for querying and editing YAML](https://github.com/mikefarah/yq) | You regularly inspect or update fields in Compose files, CI workflows, or Helm values from a script. | macos, linux, windows | 8.8/10 |
| [Lazygit terminal UI for Git](https://github.com/jesseduffield/lazygit) | You frequently move between diffs, staging, and history edits and want to stay in the terminal. | macos, linux, windows | 8.6/10 |
| [Gitleaks secret scanning for Git and files](https://github.com/gitleaks/gitleaks) | You want to catch common credentials before they land in a branch or need to audit existing Git history. | macos, linux, windows | 8.5/10 |
| [K9s terminal UI for Kubernetes](https://github.com/derailed/k9s) | You regularly investigate Kubernetes workloads and want to move between related resources without typing each kubectl command. | macos, linux, windows | 8.5/10 |
| [ast-grep structural search and rewrite](https://github.com/ast-grep/ast-grep) | You need to find or migrate code that has the same structure but varies in spacing, arguments, or local names. | macos, linux, windows | 8.4/10 |
| [Atuin searchable shell history](https://github.com/atuinsh/atuin) | Built-in reverse search returns too many matches or you regularly need a command from a specific project or shell session. | macos, linux, windows | 8.4/10 |
| [entr for rerunning commands on file changes](https://github.com/eradman/entr) | Your command lacks a useful watch mode and you want quick feedback from a specific set of files. | macos, linux | 8.4/10 |
| [Colima local container runtime](https://github.com/abiosoft/colima) | You need a local container runtime on macOS or a VM-backed container environment on Linux. | macos, linux | 8.3/10 |
| [mise runtime manager and task runner](https://github.com/jdx/mise) | You switch among repositories with different Node, Python, Go, or other tool versions and want one setup command for contributors. | macos, linux, windows | 8.3/10 |
| [Jujutsu version control with a Git backend](https://github.com/jj-vcs/jj) | You frequently revise earlier commits in a stack and spend time rebasing descendants or recovering from local history edits. | macos, linux, windows | 7.8/10 · blocker |

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
