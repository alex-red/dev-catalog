# Work on parallel Git branches with worktrees

Use a sibling checkout to handle a hotfix or review a branch while leaving your current files and dev server in place. The two checkouts share Git objects and refs, and each has its own files, index, and HEAD.

## 1. Create a sibling checkout

From your existing checkout, fetch the remote and create a new branch from its main branch. Substitute your remote, base branch, and an unused destination as needed.

```sh
git fetch origin
git worktree add -b fix/login ../app-login-fix origin/main
git worktree list
cd ../app-login-fix
git status --short --branch
```

For an existing local branch, use `git worktree add ../app-review review-branch`. Git normally prevents checking out a branch that is already active in another worktree. For a read-through or test run of a remote branch, use `git worktree add --detach ../app-review origin/review-branch`. Create a named branch with `git switch -c` before making commits you intend to keep.

## 2. Set up the project in the new directory

Run the project's usual dependency setup there. Recreate any needed ignored configuration from the project's documented setup. If both checkouts run the app, give each its own ports and isolate writable state such as local databases when the two runs need independent data.

The second directory shares your account's access. Before installing dependencies or testing code from an unfamiliar branch or fork, use a disposable environment with test credentials and keep your SSH agent, personal files, and Docker socket outside it.

Before committing or pushing, check the active branch with `git status --short --branch`. Finish the branch using the project's usual review and merge process.

## 3. Remove the checkout when finished

Return to the original checkout, confirm the sibling contains no work you still need, and let Git remove it.

```sh
git -C ../app-login-fix status --short --ignored
git worktree remove ../app-login-fix
git worktree list
```

Check the status output for untracked and ignored files you want to keep. If Git refuses removal because the checkout is dirty, preserve any needed work before cleaning up. Removing the checkout leaves its branch available. After merging, `git branch -d fix/login` checks whether Git considers the branch fully merged into its upstream, or into HEAD when it has no upstream. If a checkout directory was removed outside Git, preview stale registration cleanup with `git worktree prune --dry-run --verbose`.
