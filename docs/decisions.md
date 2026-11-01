# Decisions

Lasting choices about the catalog's shape, with reasons. Add new decisions at the end and do not renumber.

## 1. Mirror Agentic Catalog's structure

The catalog uses the same layout as [Agentic Catalog](https://github.com/alex-red/agentic-catalog): one directory per entry with an `entry.yaml`, JSON Schema validation, a controlled tag vocabulary, and generated `catalog/index.json` and `llms.txt` checked for freshness in CI. The two catalogs can share tooling ideas, and agents that know one can read the other.

## 2. Three entry types: script, workflow, tool

Scripts are small programs we can ship and test here. Workflows are procedures built from tools people already have. Tools are third-party programs that are always linked, because vendoring a binary or a whole project is neither practical nor useful. Other kinds (editor configuration, dotfiles, CI templates) can be added as types when there are real entries for them.

## 3. Platforms and requirements instead of agent hosts

Agentic Catalog records which agent hosts an entry supports. For developer tooling, what matters is the operating system and what must already be installed, so entries record `platforms` and `requires`.

## 4. A dev-v1 rubric

The rubric keeps Agentic Catalog's seven-axis, 0–4, weighted-to-10 shape, but replaces "human control" with "safety and control" and "compatibility" with "portability", since the main risks of a dev script are destructive side effects and platform assumptions. Missing grades produce no score rather than an imputed one, and blockers outrank scores. A separate `review` file is optional rather than required, to keep the cost of adding a small entry low.

## 5. Scripts are dry-run first and tested

Any script that changes state defaults to showing what it would do, and makes the change opt-in. Scripts must pass `shellcheck`, and a test under `tests/` that runs the script against a temporary fixture is what justifies `evidence: tested`.

## 6. The plugin ships only a discovery skill

As in Agentic Catalog, the plugin installs one skill that reads the published index and installs what the user approves. It ships no hooks, executables, or MCP servers.

## 7. A browsable site shared with Agentic Catalog

The site under `site/` is a port of Agentic Catalog's Vite site, so both catalogs look and work the same. It reads `catalog/index.json` and the entry files directly, with no separate data build. Host filters become platform filters, install tabs are per platform, and the bulk installer is left out because dev entries install one at a time with approval.
