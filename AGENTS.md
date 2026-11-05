# Pocket Tasks conventions

- Angular standalone components, strict TypeScript and strict templates. Keep HTML and CSS in separate files; use reactive forms.
- Keep this MVP focused: add, complete/incomplete, confirmed delete, counts, and browser storage. No backend, routing, search, filters, editing, dates, or categories.
- Keep dependencies minimal. Commit package-lock.json and use npm ci (Node version in .nvmrc).
- Treat stored JSON as untrusted. Catch storage access/read/write failures, preserve in-memory usability, and show honest persistence feedback.
- Preserve accessible names, keyboard focus, native controls, touch targets, responsive layouts, and the browser-only privacy explanation.
- Before a commit: npm test, npm run build, npm run format:check. For UI changes, check narrow phone and desktop widths if a browser is available.
- Production base path is /pocket-tasks/; assets must use relative URLs. Output is dist/pocket-tasks/browser.
- Work on codex/ branches. Reference the actual issue in PRs. PRs only check; main can deploy after checks pass. Never merge or bypass required checks without explicit authorization.
