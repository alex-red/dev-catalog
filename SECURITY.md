# Security

Scripts in this catalog run with your permissions. Read a script before installing it, and prefer its dry-run mode first.

To report a problem, such as a script that can delete or expose data unexpectedly, or a linked tool whose pinned source looks compromised, use GitHub's [private vulnerability reporting](https://github.com/alex-red/dev-catalog/security/advisories/new) for this repository. Include the entry ID, revision, reproduction, and impact, and remove credentials and private data first. Do not publish sensitive details in a public issue.

The plugin ships a discovery skill. Validation reads repository content, and the script tests use temporary fixtures.

## Repeat the checks

- `bun audit` scans the repository lockfile, including development dependencies. Pull-request validation and the Pages build gate on high or critical advisories.
- `zizmor --offline .github/workflows` checks the workflow configuration. CI reports findings in the job log.
- `bun run security:catalog` sends one batch of linked tool source commits to OSV. It fails on undocumented matches or an incomplete response. The weekly advisory job runs it alongside a full Bun audit.
- On macOS, `brew vulns --brewfile=docs/starter-pack/Brewfile --deps --json` checks Starter Pack formulae and reports skipped packages. On Linux, use your distribution's security advisories for the installed package version, including any backported fix. See [Homebrew vulnerability scanning](https://docs.brew.sh/Homebrew-Vulnerability-Management), [Debian Security Tracker](https://security-tracker.debian.org/tracker/), and [Ubuntu security notices](https://ubuntu.com/security/notices).

The catalog scan covers reviewed source commits. Check installed packages and their dependencies separately. Record confirmed matches as scoped blockers and remove them when a fixed source or build is verified. Current blockers include [fzf](entries/tools/fzf/entry.yaml) and [DuckDB](entries/tools/duckdb/entry.yaml).
