# 2026 Developer Starter Pack

Start with Git and [seven everyday terminal tools](../../collections/developer-starter-pack-2026.yaml) for macOS or Linux. Use your usual package manager, then add the tools that fit your projects.

## Install

### macOS

Install [Homebrew](https://brew.sh/) if needed. Download this repository or clone it, then run the command below from its root. The [Brewfile](Brewfile) lists the eight formulae. `--no-upgrade` keeps Bundle from requesting upgrades for installed formulae.

```sh
brew bundle install --file docs/starter-pack/Brewfile --no-upgrade
```

### Debian 13 and Ubuntu 24.04 LTS

```sh
sudo apt update && sudo apt install git ripgrep fd-find eza bat zoxide jq shellcheck
```

On Ubuntu, enable the official Universe component if your image omits it. On Debian and Ubuntu, use `fdfind` if the `fd` executable is absent and `batcat` if `bat` is absent.

### Fedora 44 and 45

```sh
sudo dnf install git ripgrep fd-find eza bat zoxide jq ShellCheck
```

These commands install package-manager versions. On other distributions, use the per-tool instructions in the [catalog](../../README.md#tools).

The pack omits [fzf](../../entries/tools/fzf/entry.yaml) while the reviewed release is affected by [CVE-2026-115319](https://osv.dev/vulnerability/CVE-2026-115319). If you already installed it, check your package provider for a build with the fix.

## Check the install

From the repository root, try a search, a file lookup, a JSON query, and a shell lint. The expected results are the starter pack link in the README, the path to the Brewfile, `true`, and a successful ShellCheck run with no diagnostics.

```sh
rg '2026 Developer Starter Pack' README.md
if command -v fd >/dev/null 2>&1; then
  fd -F Brewfile docs
else
  fdfind -F Brewfile docs
fi
jq -e '.schemaVersion == 1' catalog/index.json
printf '%s\n' '#!/bin/sh' 'printf "%s\n" hello' | shellcheck -
```

Try `eza --tree --level=2 docs` for a directory overview, and `bat docs/starter-pack/Brewfile` to read the manifest.

## Optional shell setup

To enable zoxide, put the line for your shell in its startup file, then open a new terminal. After visiting a repository with `cd`, use `z` followed by part of the repository name to jump back.

| Shell | Startup file | Line to add |
| --- | --- | --- |
| Bash | `~/.bashrc` | `eval "$(zoxide init bash)"` |
| Zsh | `~/.zshrc` | `eval "$(zoxide init zsh)"` |
| Fish | `~/.config/fish/config.fish` | `zoxide init fish \| source` |

See the [zoxide setup guide](https://github.com/ajeetdsouza/zoxide#installation) for details.

## Add tools for your work

| When you need | Add |
| --- | --- |
| GitHub PRs, CI runs, and visual staging | [GitHub CLI](../../entries/tools/gh/entry.yaml) and [Lazygit](../../entries/tools/lazygit/entry.yaml). Run `gh auth login` when ready. |
| Python environments, linting, and formatting | [uv](../../entries/tools/uv/entry.yaml) and [Ruff](../../entries/tools/ruff/entry.yaml). |
| Versioned runtimes across several languages | [mise](../../entries/tools/mise/entry.yaml). |
| API debugging and repeatable HTTP tests | [xh](../../entries/tools/xh/entry.yaml) and [Hurl](../../entries/tools/hurl/entry.yaml). |
| Local resource and disk investigation | [btop](../../entries/tools/btop/entry.yaml), [dust](../../entries/tools/dust/entry.yaml), and [ncdu](../../entries/tools/ncdu/entry.yaml). |
| Local containers and image inspection | [Colima and Docker CLI](../../entries/tools/colima/entry.yaml) on macOS, or your project's Docker or Podman setup on Linux. Add [Dive](../../entries/tools/dive/entry.yaml) to inspect image layers. |
