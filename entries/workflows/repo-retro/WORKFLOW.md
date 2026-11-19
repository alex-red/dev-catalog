# Review a repository's agent workflow

Use a retrospective when similar tasks keep producing the same correction, retry, or CI failure. The review is scoped to this repository and produces proposals you can evaluate before making changes.

## Run a retrospective

1. Start a coding-agent session in the repository you want to review.
2. Give the agent [SKILL.md](SKILL.md) and ask it to use those instructions. For reuse, save the file as `repo-retro/SKILL.md` in a skill directory your agent discovers and invoke `$repo-retro` in Codex.
3. Name a time range or theme when you have one. For example, ask the agent to “Review the last month of this repository’s sessions and look for checks we repeatedly ran late.” Codex chat tools can discover matching history. If those tools are unavailable, provide repo-specific transcript excerpts or use `mistakes/lessons.md` in the repository.
4. Ask for the evidence behind each proposal, where the change belongs, and how you would verify it on the next comparable task. Decide which changes to apply after reading the report.

A lessons file is optional. A useful entry records the task, what happened, the consequence, and the command or decision that helped. Keep private transcript details and credentials out of shared notes.
