# git-prune-merged

Lists local Git branches that are already merged into the default branch, and deletes them only when asked.

```sh
git-prune-merged                 # dry run: print what would be deleted
git-prune-merged --delete        # delete the listed branches
git-prune-merged --base develop  # compare against a branch other than the default
```

## Install

Copy `git-prune-merged` to a directory on your `PATH`, such as `~/.local/bin`, and keep it executable. Git then also runs it as `git prune-merged`.

## Behavior

- The base branch is `origin/HEAD` when set, otherwise the first of `main`, `master`, or `trunk` that exists locally. Pass `--base` to override.
- A branch counts as merged when its tip is reachable from the base branch, the same test as `git branch --merged`. The local base is preferred over `origin/<base>`, so fetch and fast-forward first if the local copy is stale.
- The base branch, the current branch, and any branch checked out in another worktree are skipped.
- It only touches local branches. Remote branches and their remote-tracking refs are left alone.

## Limitations

- Squash-merged and rebase-merged branches are not detected, because their commits never become reachable from the base. Delete those by hand, or look for branches whose upstream is gone with `git branch -vv | grep ': gone]'`.
- A branch that was just created from the base, with no new commits, also counts as merged. Review the dry-run list before deleting.

Deleted branches can be recovered from the reflog for as long as Git keeps it: `git reflog`, then `git branch NAME SHA`.
