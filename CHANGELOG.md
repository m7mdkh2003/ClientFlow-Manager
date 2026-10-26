# Workspace usability update

## Changes

- Trim required names on the API and reject empty updates with validation responses.
- Preserve useful dependency-delete errors and keep searches independent between pages.
- Use a keyboard-accessible editor with focus restoration and unsaved-change confirmation.
- Add client and project details, linked records, and project task progress.
- Preselect the parent when creating a project from a client or a task from a project.
- Add task filters, sorting, empty-result reset, and CSV exports of the visible records.
- Separate overdue tasks from upcoming deadlines and guide first-time workspace setup.
- Add a read-only `/demo` route with sample data and no private workspace API requests.
- Isolate the query cache per account, including transitions into and out of the demo.
- Improve small-screen text and public descriptions.
- Add portable local startup, an environment example, current setup/deployment documentation, and CI checks.
- Stop tracking the large local backup archive; local backups are ignored. Historical Git/LFS objects are unchanged.

## Validation

- `pnpm install --frozen-lockfile` succeeded from the updated lockfile.
- `pnpm test`: **31 passed** across API, authorization, UI integration, and utility scenarios.
- `pnpm build`: TypeScript checks and production API/frontend builds succeeded.
- Formatting and whitespace checks passed.

Tests use isolated PGlite PostgreSQL databases, simulated Clerk identities, and jsdom UI integration. No test records were written to the published app. A fresh browser check of the changed local build could not be completed from the remote browser environment. Real Clerk sign-in and mobile/visual checks remain part of acceptance after deployment.

## Deployment impact

No database schema changes or data migrations are introduced. The existing Replit deployment services and production router definitions are retained. The published application changes only after this code is synced and republished on Replit.
