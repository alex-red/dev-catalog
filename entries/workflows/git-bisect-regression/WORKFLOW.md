# Find a regression with git bisect run

Use a binary search over history to find the first commit where a check starts failing. With an automated check, Git tests about log2(N) commits, so 1,000 commits take about ten runs.

## 1. Write a check that answers one question

Make a script that exits with:

| Exit code | Meaning |
| --- | --- |
| `0` | good: the regression is absent |
| `1`–`124`, `126`, `127` | bad: the regression is present |
| `125` | skip: this commit cannot be tested |
| `128` or more | abort the bisect |

Test the regression itself, not the whole suite. Unrelated failures in older commits would otherwise be reported as the culprit.

```sh
#!/bin/sh
# check.sh — kept outside the repository so checkouts do not change it.
npm ci --ignore-scripts --silent || exit 125
[ -x ./node_modules/.bin/vitest ] || exit 125
./node_modules/.bin/vitest run src/cart.test.ts -t "applies discount" >/dev/null 2>&1
```

Create a private temporary directory with `check_dir=$(mktemp -d)`. Save the check as `"$check_dir/check.sh"` and make it executable. Keeping it outside the working tree protects it from checkouts and stashes.

Tests execute code from each revision. For unfamiliar history, run the bisect in a disposable environment with test credentials and without access to your personal files, SSH agent, or Docker socket. The example skips npm lifecycle scripts. If the project needs them, inspect what they run before enabling them.

## 2. Confirm both ends

Run the check by hand on a known-bad commit (usually `HEAD`) and a known-good one (a release tag, or a commit from before the report). The check must fail on the first and pass on the second. If it does not, the check is wrong, and the bisect will be too.

## 3. Run it

```sh
git stash --include-untracked        # bisect needs a clean tree
git bisect start BAD GOOD
git bisect run "$check_dir/check.sh"
git bisect log > "$check_dir/bisect.log"
git bisect reset
```

Git prints `<sha> is the first bad commit`. Read that commit's diff before believing it.

## 4. Handle the awkward cases

- **Flaky check:** run the test several times inside the script and fail only if any run fails, or the search will wander. Bisect gives a wrong answer silently when a single result is wrong.
- **Merges:** `git bisect start --first-parent` follows only the main line and points at the merge that brought the change in. Bisect again inside that branch if you need the exact commit.
- **Build or dependency changes:** reinstall dependencies inside the script, as above, and exit `125` when the build cannot succeed.
- **Narrowing to paths:** `git bisect start BAD GOOD -- src/cart/` tests only commits that touch those paths.
- **Renamed terms:** for "when did this get faster" searches, `git bisect start --term-old=slow --term-new=fast` avoids inverting good and bad in your head.

## 5. Record the result

Write down the first bad commit, the check script, and the bisect log in the issue or pull request that fixes it. Add the check as a regression test if it is not one already.
