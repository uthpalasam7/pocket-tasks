# Pocket Tasks

A calm, mobile-friendly personal task tracker. Add a task, check it off, and make a little room in your day.

**Live URL after merge and successful deployment:** [uthpalasam7.github.io/pocket-tasks](https://uthpalasam7.github.io/pocket-tasks/).

## What’s included

- Required, trimmed titles with feedback for blank or whitespace-only input.
- Complete/incomplete checkboxes, confirmed deletion with cancellation, and total/active/completed counts.
- Browser localStorage persistence, validation of saved data, and visible feedback if storage is corrupt, denied, or full. Tasks remain usable in memory if saving fails; a later successful change retries saving the whole list.
- An empty state, accessible labels, native keyboard controls, visible focus, touch targets, and responsive layouts.

Tasks live **only in the current browser profile on this device**. They do not sync. Clearing site data removes them; private browsing may discard them at the end of the session. If stored data is unreadable, the app starts empty and warns before the next task change replaces it. There is no backend, login, analytics, paid service, or external API. Search, filters, editing, due dates, and categories are outside this version.

## Requirements and local development

- Angular **22.2** (current stable release when this version was built; exact dependencies are in `package-lock.json`).
- Node **24.15 or later in the 24.x line**, npm **11.x**. `.nvmrc` pins Node **24.22.1**, also used in CI.
- A modern browser supporting localStorage and `crypto.randomUUID()` (current Chrome, Edge, Firefox, Safari). Use localhost or HTTPS.

```sh
nvm use # optional, if you use nvm
npm ci
npm start
```

Open [localhost:4200](http://localhost:4200). The development server uses `/`; production uses `/pocket-tasks/`.

## Verification

```sh
npm test                 # Angular's Vitest runner; one run, no watch
npm run test:watch       # optional interactive watch mode
npm run build           # optimized production build, including strict template checking
npm run format:check
```

Tests cover blank validation, trimming and addition through the form, toggling both ways, confirmation/cancellation and targeted deletion, counts, restoration after store recreation, malformed JSON/schema/duplicate IDs, denied storage access, read and write failures, recovery, and visible storage feedback. Components use standalone Angular APIs, reactive forms, and separate templates/styles. There are no runtime UI libraries.

The production output is `dist/pocket-tasks/browser`. `angular.json` sets the production base URL to `/pocket-tasks/`; assets use relative URLs so scripts, styles, and the favicon load under the repository path.

To preview the production build at its actual path:

```sh
mkdir -p /tmp/pocket-tasks-preview/pocket-tasks
cp -R dist/pocket-tasks/browser/. /tmp/pocket-tasks-preview/pocket-tasks/
python3 -m http.server 8080 --directory /tmp/pocket-tasks-preview
```

Open [localhost:8080/pocket-tasks/](http://localhost:8080/pocket-tasks/).

## Issue → development → PR → checks → merge → Pages

The MVP is tracked in [issue #1](https://github.com/uthpalasam7/pocket-tasks/issues/1). Work is on `codex/pocket-tasks-mvp`; its implementation PR includes `Closes #1` so GitHub closes the issue when the PR is merged into the default branch.

The `CI and Pages` GitHub Actions workflow runs `npm ci`, `npm test`, and `npm run build` on pull requests **targeting `main`** and pushes **to `main`**. The required check is named **Tests and production build**. PRs never upload a Pages artifact or deploy, including PRs originating from `main`. The deploy job requires successful checks and a non-PR event on `refs/heads/main`; failed tests or a failed build block artifact upload and deployment. An optional manual run also checks and deploys only when **main** is selected; manual runs from other branches skip both jobs.

The checks job has only repository read permission. The deploy job has only `pages: write` and `id-token: write` permissions and uses the `github-pages` environment. No hosting token or other secret is required. Deployments are serialized to avoid concurrent publication.

### Manual GitHub settings

These settings are **not assumed to be enabled**:

1. In [repository Settings → Pages](https://github.com/uthpalasam7/pocket-tasks/settings/pages), set **Build and deployment → Source → GitHub Actions**. Save if prompted. Do not select branch-based publishing or another hosting service.
2. In **Settings → Actions → General**, allow GitHub Actions and the official `actions/*` actions used by the workflow if repository or organization policy restricts them. Job-scoped permissions in the workflow supply deployment access.
3. If the `github-pages` environment has deployment rules, allow **main** and satisfy any required approvals. Consider restricting its deployment branches to main as an additional guard.
4. In [Settings → Rules → Rulesets](https://github.com/uthpalasam7/pocket-tasks/settings/rules) (or **Branches → Branch protection**), create a rule targeting **main**: require a pull request, require status checks, select **Tests and production build** after the first PR run has registered it, and require the branch to be up to date. Block force pushes and deletion; disable bypasses (including administrators) if you want everyone held to the same checks. A required review is also recommended. Availability depends on repository visibility and GitHub plan.

Do not merge until the PR has been reviewed and the required check is green. **Adding the workflow does not enable branch protection.** No merge, Pages settings change, or branch-protection change is performed as part of this implementation.

After merging, watch **Actions → CI and Pages** for the main push. Both **Tests and production build** and **Deploy to GitHub Pages** must pass. Then open the live URL above. If Pages was enabled after the push, use **Run workflow → main** to run checks and deployment again. For deployment failure, inspect the job logs, Pages source, and environment restrictions; failed checks must be fixed through a PR before deployment.

## Phone-testing checklist

- Open the live HTTPS URL in your phone’s browser, in portrait and landscape; confirm there is no horizontal scrolling and the favicon/assets load.
- Submit an empty title and spaces; check the clear error. Add a long title and confirm it wraps and the keyboard/controls remain usable.
- Add two tasks, toggle one complete and back, and check all three counts.
- Cancel a deletion, then confirm it; check that only the selected task is removed.
- Refresh and reopen the page in the same browser; confirm tasks persist. Another browser/device should have a separate list.
- Try keyboard navigation and visible focus on desktop; use VoiceOver/TalkBack on your phone to check labels and count announcements.
- If you can disable site storage, confirm the warning and continued in-tab operation. Avoid clearing real tasks just to test this; use a separate browser profile.
