# Rating guide (dev-v1)

Ratings are curator judgments of how useful an entry is to a developer, compared with what they would otherwise use. They are not measurements. Evidence is recorded separately and never changes the score.

## Grades

Each axis is graded 0–4. Higher is always better.

| Axis | Weight | 4 means | 0 means |
| --- | --- | --- | --- |
| Practical value (`value`) | 25% | Solves a frequent, real problem much better than the built-in or common alternative | No improvement over what is already installed |
| Dependability (`dependability`) | 20% | Behaves the same way every time; failure modes are clear | Often wrong or silently wrong |
| Ease of use (`ease`) | 15% | Obvious from `--help` or a short read; sensible defaults | Needs study or constant reference to use correctly |
| Safety and control (`safety`) | 15% | Read-only, or dry-run by default with explicit opt-in for changes; easy to undo | Changes or deletes things without warning, or hard to reverse |
| Adoption cost (`adoption`) | 10% | One command or one file to install; no new runtimes | Heavy dependencies, accounts, or configuration before first use |
| Portability (`portability`) | 10% | Works on macOS, Linux, and Windows, or wherever its declared requirements exist | Tied to one machine setup |
| Upkeep (`upkeep`) | 5% | Stable and maintained, or so small it needs no maintenance | Abandoned with known breakage |

The score is the weighted sum divided by 40, giving a value out of 10 rounded to one decimal place. All grades 4 gives 10.0; all grades 2 gives 5.0.

## Missing grades and blockers

If you cannot judge an axis, leave it out and say why in `unknowns`. An entry with any missing grade has no score and is listed after complete ones.

`blockers` record something that should stop a recommendation in a stated scope, such as "Windows: requires GNU sed". A high score never clears a blocker. Entries with blockers are listed last.

## Evidence

| Level | Meaning | Requires |
| --- | --- | --- |
| `reviewed` | Read and judged | Nothing beyond the rating |
| `used` | Used in real work by the curator | Linked notes in `evidence` |
| `tested` | Automated checks in this repository exercise it | Linked tests in `evidence` |

Start every entry at `reviewed` unless a test in this repository backs `tested`.

## Notes

`notes` (up to 600 characters) explains the grades: the main tradeoff, the surprising failure mode, and where the entry is weaker. Put the comparison with alternatives in `overlap`. A longer assessment can live in `docs/reviews/<date>-<id>.md`, linked from `rating.review`.
