# Installing Dev Catalog entries

Every install needs the user's approval for the specific entry and destination. Show what will run before running it.

## Scripts

1. Read the script in full and show it, or summarize what it does if it is long.
2. Check every program in `requires` with `command -v`.
3. Ask where to install. Default to `~/.local/bin` on macOS and Linux, and check that it is on `PATH`.
4. Copy each file in the entry's `files` list except `SCRIPT.md` and license files, keeping the file name, then `chmod +x` it.
5. If a command of the same name already exists (`command -v NAME`), stop and ask.

From a local checkout:

```sh
install -m 0755 entries/scripts/ID/NAME ~/.local/bin/NAME
```

From the published catalog:

```sh
curl -fsSL https://raw.githubusercontent.com/alex-red/dev-catalog/main/entries/scripts/ID/NAME -o ~/.local/bin/NAME
chmod +x ~/.local/bin/NAME
```

Keep a note of the catalog entry ID and revision with the script, for example in a comment at the top, so the user can update it later.

## Workflows

Workflows are procedures, not programs. Show `WORKFLOW.md`, or save it where the user keeps notes or project documentation. Follow its steps with the user.

## Tools

Tools are always linked to their upstream project. Use the entry's `install` field:

- Use the step for the user's platform (`macos`, `linux`, `windows`), or `any`.
- Prefer a package manager the user already has. Do not install a package manager to install a tool without asking.
- Pin `source.version` where the package manager allows it, and read `install.notes` for caveats.
- If the upstream instructions at `source.url` differ materially from the catalog entry, stop and tell the user.
