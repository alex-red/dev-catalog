# Contributing

An entry earns its place by being the best available option for a real job, or a clearly labelled alternative to one. Before adding one, search the catalog for overlap and check what the platform or a common tool already does: `git` subcommands, coreutils, package manager features.

## Propose an entry

Open an [entry proposal](https://github.com/alex-red/dev-catalog/issues/new?template=entry-proposal.yml) with the source, license, and the job it does. A pull request that adds the entry directly is also welcome.

## Add an entry

1. Create `entries/<type>s/<id>/entry.yaml` following the [entry schema](catalog/schema/entry.schema.json). The ID must match the directory, and the type must match the parent folder. Choose tags from the [tag vocabulary](catalog/tags.yaml); register a new term there, with a facet and definition, only when no existing term or alias fits. Every registered tag must be used.
2. Add the payload unless the entry is linked:

   | Type | Payload |
   | --- | --- |
   | script | `SCRIPT.md` (usage, install, behavior, limitations) and at least one executable script |
   | workflow | `WORKFLOW.md`: the procedure, with commands |
   | tool | Always linked: `entry.yaml` only, with `install` steps per platform |

3. List `platforms` you have reason to believe it works on (`any` only for genuinely portable content) and every program it needs in `requires`.
4. Use the [rating guide](docs/ratings.md) to record seven 0–4 grades, `evidence`, the `reviewed` date, and `notes` on tradeoffs. Omit grades you cannot judge and name them in `unknowns`. Record relevant CVEs in `advisories` and reserve `blockers` for critical issues that affect ordinary use. A longer assessment can go in `docs/reviews/` and be linked from `rating.review`.
5. Run `bun run catalog:build` and `bun run check`.

## Scripts

- Prefer POSIX `sh` or Bash 3.2-compatible Bash, so scripts run on stock macOS. Say so in `requires` when a script needs more.
- Default to a dry run, or to read-only output, when the script changes anything. Make destructive steps opt-in with a flag.
- Support `--help`, exit non-zero on errors, and write errors to standard error.
- Pass `shellcheck`. CI runs it on every file with a shell shebang under `entries/`.
- Add a test in `tests/` that runs the script in a temporary directory. That test is what justifies `evidence: tested`.

## Sources and licenses

- **original:** written here; MIT.
- **adapted:** written here from cited material. List each source in `inspiredBy`. Do not copy text from sources without a permissive license.
- **vendored:** an unmodified copy of a permissively licensed upstream (MIT, Apache-2.0, BSD, ISC). Read every file first. Record `url`, `path`, the full commit `revision`, the `retrieved` date, `license`, and `author`, and include the upstream license file. Add the directory to the ignore list in `.markdownlint-cli2.jsonc`.
- **linked:** upstream only, for tools and for anything with a restrictive or missing license. The directory holds only `entry.yaml`. Pin `revision` (and `version` for a release), record the `retrieved` date, and give install steps in `install`.

Check the actual license file, not the README.
