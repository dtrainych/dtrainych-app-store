# Umbrel Apps Agent Guide

Use the relevant repo-local skill in `.agents/skills/`.

- Package an existing upstream app for the App Store: `umbrel-package-app`
- Update an existing App Store package: `umbrel-update-app`
  - For OpenGym app or MCP updates (for example, "update opengym app and mcp"), also read `.agents/skills/umbrel-update-app/references/opengym.md`.
- Test or verify an App Store package: `umbrel-test-app`
- Build a self-hosted app that can be packaged for the App Store: `umbrel-develop-app`

Keep changes scoped to the requested app unless the task explicitly requires shared changes.
