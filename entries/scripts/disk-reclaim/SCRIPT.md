# disk-reclaim

Finds reclaimable disk space on a development machine, lists it by risk with sizes, and deletes only the items you pick.

```sh
disk-reclaim                     # scan, list, then prompt for a selection and a confirmation
disk-reclaim --list              # scan and list only
disk-reclaim -s safe --dry-run   # show the commands that would run for every safe item
disk-reclaim -s 1-5,9 --yes      # clear items 1 to 5 and 9 without prompting
disk-reclaim --root ~/work       # scan a different project root for build output
```

Run `disk-reclaim --help` for every option.

## Install

Copy `disk-reclaim` to a directory on your `PATH`, such as `~/.local/bin`, and keep it executable. It needs only Bash and the standard system tools. If [`fd`](https://github.com/sharkdp/fd) is installed (as `fd`, or `fdfind` on Debian and Ubuntu), the project scan uses it and runs faster.

## What it looks at

- **Safe**: caches that regenerate on their own. These include Go, npm, pnpm, bun, Yarn, Gradle, Maven and Cargo caches, `~/.cache`, `~/Library/Caches` on macOS, Xcode DerivedData, Homebrew downloads, Docker build cache and dangling images, and your own old files in `/tmp` and `$TMPDIR`.
- **Rebuild**: dependencies and build output that you reinstall or rebuild the next time you use a project. These include `node_modules`, `.venv` in projects idle for `--days` (default 60), Cargo `target/`, CocoaPods `Pods/`, and framework build folders such as `.next`.
- **Review**: things that may hold data. These include the Trash, Docker volumes and unused tagged images, superseded Node and Rust toolchains, Android images, Xcode archives, iPhone backups, large old downloads, and Claude Code worktrees.

To add your own paths, put lines of the form `risk<TAB>path<TAB>note` in `~/.config/disk-reclaim/paths`.

## Safety

- Nothing is deleted until you select items and confirm. Without a terminal it exits after listing, unless you pass both `--select` and `--yes`.
- Every path it removes must be inside `$HOME` and at least two levels deep. The exceptions are temp-dir entries, which must be top-level entries you own outright.
- Caches keep anything created or changed in the last `--keep-hours` (default 24), judged by ctime. Temp-dir entries also skip anything with sockets or recent changes, and anything owned by another user.
- Read the Review section before selecting it. Docker volumes and the Trash are deleted for good.

## Platforms

macOS and Linux. The Xcode, simulator, `~/Library` and iPhone-backup cleaners only run on macOS. Linux uses `~/.cache` and the freedesktop Trash. System-wide locations that need root, such as the systemd journal, Snap revisions and Flatpak runtimes, are not touched.

## Limitations

- Sizes are estimates. Cloned (APFS, btrfs) and hard-linked files share blocks, so the space actually freed, which is measured with `df` at the end, can be lower than the listed total. Sizes marked `≤` are upper bounds.
- Scanning large temp dirs can take a while. Pass `--no-temp` to skip them.
- It knows the cache layouts of the tools listed above. Those layouts change, so a new tool version can leave a cache unlisted.
