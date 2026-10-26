# ClientFlow Manager

A freelancer workspace for managing clients, projects, tasks, and deadlines.
Built by **Mohammad Rawhu Kattab** with React, TypeScript, Express, PostgreSQL, Drizzle, and Clerk.

[Deployed application](https://client-flow-manager--m7mdkh2003.replit.app/) · [GitHub](https://github.com/m7mdkh2003/ClientFlow-Manager)

The deployed application is updated separately from GitHub. Republish on Replit after syncing this revision. This revision adds a public **`/demo`** route with sample data; it never requests private workspace data.

## Features

- Private, user-specific client, project, and task records with Clerk sign-in.
- Client details with linked projects, full contact information, and notes.
- Project details with linked tasks, deadlines, and completion progress.
- Task boards with To do, In progress, and Done states.
- Filters by client, project, priority, and due date; sorting and independent searches.
- Separate overdue, due-today, and upcoming deadline summaries.
- CSV exports for the currently displayed clients, projects, and tasks.
- Guided first-client → project → task setup.
- Keyboard-accessible editors, required-name validation, and unsaved-change confirmation.
- Read-only demo with working navigation and filters, without account creation.

## Requirements

- Node.js **24+** and pnpm **11.25.0** (declared in `package.json`).
- PostgreSQL for a private workspace; a separate local development database is recommended.
- Your own Clerk development instance and matching public/secret keys for sign-in.

The automated checks and the public demo do **not** require a Clerk account, a PostgreSQL service, or production credentials.

## Install and check

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

`pnpm build` runs TypeScript checks and builds all workspace artifacts. GitHub Actions runs the same tests and build on pushes and pull requests.

## Run the public demo locally

```sh
pnpm --filter @workspace/clientflow dev
```

Open **http://localhost:3000/demo**. Leave Clerk variables unset for a demo-only run; no private API server or database is required. The demo is read-only, and its CSV exports contain sample records only.

## Run a private workspace locally

1. Copy `.env.example` to `.env` in the repository root (`Copy-Item .env.example .env` in PowerShell, or `cp .env.example .env` in a Unix shell).
2. Replace the example database URL and all Clerk placeholders with your own **development** credentials. Enable `http://localhost:3000` in your Clerk development configuration as required.
3. Create the database named in your connection string, then apply the schema:

   ```sh
   pnpm --filter @workspace/db push
   ```

   Review Drizzle's proposed changes before applying them to an existing database. This update does not change the database schema.

4. Start the API in one terminal:

   ```sh
   pnpm --filter @workspace/api-server dev
   ```

5. Start the frontend in another terminal:

   ```sh
   pnpm --filter @workspace/clientflow dev
   ```

Open **http://localhost:3000**. The API defaults to port **3001**, and the optional `API_PROXY_TARGET` setting forwards browser `/api` requests through the frontend so cookies and write requests remain on the same origin. Local `.env` files are loaded automatically. Existing shell variables take precedence.

For custom ports, set `PORT` in each terminal separately and update `API_PROXY_TARGET` to point to the API. Replit supplies its own service ports and routing.

## Replit deployment

The existing `.replit` and artifact service definitions are retained: the frontend serves static assets and the API handles `/api` on port 8080.

1. Sync this revision into the existing Replit project.
2. Keep `DATABASE_URL`, Clerk keys, and any Clerk proxy configuration in Replit Secrets/Auth configuration. Use production keys matching the deployed domain.
3. Run `pnpm test` and `pnpm build`.
4. Publish the project using its existing deployment configuration.
5. Check `/demo`, then verify real sign-in, create a client → project → task, reload, sign out, and confirm signed-out workspace API requests are rejected.

Replit routes `/api` itself; `API_PROXY_TARGET` is intended for local development. Database migrations are not required by these improvements. Do not use `push-force` against an existing production database.

For another host, serve `artifacts/clientflow/dist/public` with an SPA fallback to `index.html`, route `/api` to the built API server, set the required database/Clerk environment variables, `NODE_ENV=production`, and the host-provided `PORT`, then run:

```sh
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

## Tests and limits

`pnpm test` uses an isolated in-memory PostgreSQL engine (PGlite), real API routes, and simulated Clerk identities. UI integration tests render React in jsdom and exercise the generated API client against the application routes.

Coverage includes authentication/ownership checks, CRUD, parent relationships, validation, filters, details navigation, deadline summaries, CSV escaping, keyboard interactions, unsaved changes, network-failure retry, and demo isolation. Test data never goes to the deployed application.

These checks do not replace a real Clerk sign-in or a device/browser acceptance test after deployment. Optional integration tests against a separate PostgreSQL database can be run with `pnpm --filter @workspace/api-server test` after setting `DATABASE_URL` and applying the schema.

## Repository layout

- `artifacts/clientflow` — React app and public demo.
- `artifacts/api-server` — Express routes, authentication, and validation.
- `lib/db` — PostgreSQL schema and Drizzle configuration.
- `lib/api-spec` — OpenAPI source and code generation.
- `lib/api-client-react`, `lib/api-zod` — generated API clients/schemas.
- `tests` — isolated database adapter and regression tests.

The project was developed with AI assistance on Replit. Its application data is stored in PostgreSQL; Git contains source code, not backups of application data. Large local backups and caches are excluded from future commits.
