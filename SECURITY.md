# Security

Scripts in this catalog run with your permissions. Read a script before installing it, and prefer its dry-run mode first.

To report a problem, such as a script that can delete or expose data unexpectedly, or a linked tool whose pinned source looks compromised, use GitHub's [private vulnerability reporting](https://github.com/alex-red/dev-catalog/security/advisories/new) for this repository. Include the entry ID, revision, reproduction, and impact, and remove credentials and private data first. Do not publish sensitive details in a public issue.

The plugin ships one skill only: no hooks, MCP servers, or executables. Validation reads repository content, and the tests create and delete temporary Git repositories.
