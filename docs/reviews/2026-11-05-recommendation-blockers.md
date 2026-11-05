# Security and compatibility review for November 5, 2026

This review checks the three former recommendation blockers against published advisories, tagged source, and upstream release status. Package versions alone do not establish whether a distributor has backported a fix.

## fzf: optional HTTP server

[CVE-2026-115319](https://osv.dev/vulnerability/CVE-2026-115319) describes a denial of service in the HTTP action parser. A crafted POST can keep the server busy because parsing repeatedly copies the growing string. The [v0.74.5 source](https://raw.githubusercontent.com/junegunn/fzf/v0.74.5/src/options.go) still uses that parser. The [upstream fix](https://github.com/junegunn/fzf/commit/b412a450538e5f4a1d7057732e75d945dafa18a6) replaces the repeated concatenation. The [latest stable release](https://github.com/junegunn/fzf/releases/latest) and the [Homebrew formula](https://github.com/Homebrew/homebrew-core/blob/HEAD/Formula/f/fzf.rb) still point to v0.74.5 at review time. The release notes list fixes for two separate issues.

The advisory scores 2.0 (Low). The Starter Pack uses fzf for ordinary file and history picking, which do not require the server. Leave the HTTP server off on affected builds. Check invocations, shell wrappers, `FZF_DEFAULT_OPTS`, and `FZF_DEFAULT_OPTS_FILE` for `--listen` and `--listen-unsafe`.

## DuckDB: untrusted Brotli-compressed data

[CVE-2026-111497](https://osv.dev/vulnerability/CVE-2026-111497) is an out-of-bounds write in Brotli's decoder. DuckDB vendors that decoder, which can be reached by reading a crafted Brotli-compressed Parquet file. The [DuckDB fix](https://github.com/duckdb/duckdb/pull/27791) merged to `main` on November 3 as `94be654`. A maintainer confirmed the fix is intended for 2.0.1, which the [release calendar](https://duckdb.org/release_calendar) tentatively lists for November 18. The [latest stable release](https://github.com/duckdb/duckdb/releases/latest) is 2.0.0 at review time. The [Homebrew formula](https://github.com/Homebrew/homebrew-core/blob/HEAD/Formula/d/duckdb.rb) builds that tag without the decoder patch.

The underlying Brotli advisory scores 9.2 (Critical). The DuckDB exposure depends on decoding attacker-controlled Brotli input. Use a confirmed patched build before reading untrusted Parquet, since the `.parquet` extension does not identify the codec. Updating the system Brotli package does not replace DuckDB's bundled copy.

## Jujutsu: Git submodules

The [v0.47.1 release](https://github.com/jj-vcs/jj/releases/tag/v0.47.1) still has the limitation described in the [Git compatibility docs](https://docs.jj-vcs.dev/latest/git-compatibility/#supported-features). Jujutsu retains the recorded submodule commit references, but its checkout does not populate the submodule contents. Upstream tracks native support in [submodule milestones](https://github.com/jj-vcs/jj/milestones) with no published due date. This is a compatibility issue.

Use Git when builds or tests require those files. The catalog records this as a compatibility note because it affects repositories that depend on submodules.
