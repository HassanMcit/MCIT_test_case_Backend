# Project deadlines and cache revisions

Build and deploy this backend before the paired frontend. Startup applies
`20261104_project_deadlines_v1` and `20261104_cache_revision_v1` transactionally,
after the existing workflow migration. Existing project rows keep nullable
schedules and designated testers. No production migration was run during development.

New project requests require ISO 8601 `startAt`/`endAt` with UTC offsets and
start before end. Both columns use TIMESTAMPTZ. Optional `assignedTesterId`
accepts null; non-null values must identify a tester. Admin-only existing
project POST/PATCH endpoints enforce authorization, and PATCH validates merged
date ranges. `GET /api/users/testers` is admin-only and returns names/IDs.

The existing `project_assignments` table remains the membership authority. A
`primaryManaged` marker distinguishes memberships created by the designated
tester control. Removing/changing the designated tester preserves independent
team assignments. Deleting a membership clears a matching designated tester.
Project writes, managed membership and assignment notifications are transactional.

`ProjectDeadlinesService` runs at bootstrap and every 30 seconds using Nest
lifecycle hooks. Keep the backend process running for prompt delivery; sleeping
hosts catch up when restarted/woken. Scans handle 200 due projects per batch,
only for active projects with an assigned tester and current membership.
Already-expired deadlines are accepted and notified on the next scan.

A single atomic SQL statement uses project row locks/SKIP LOCKED, a unique
`(projectId,endAt,userId)` delivery ledger, and a notification insert. Concurrent
instances/restarts cannot duplicate that tuple. Notification insert failures roll
back delivery state and retry later. A different deadline or recipient permits a
new delivery; restoring an already-delivered tuple does not. Completed, cancelled,
archived, future and unassigned projects are excluded. Events publish to the
recipient-only existing SSE service after commit; fresh frontend polling also
covers other backend instances and missed events. Messages are bilingual, unread,
persisted, and link to `/projects?project=<id>`.

The singleton cache revision is bumped in the same transaction as writes to
projects, assignments, users, cases, releases, cycles/items/executions, quality
applications and checklists. The paired frontend checks current authorization
and this revision before using scoped cached business data. Notifications,
sessions and audit events remain live reads. This intentionally broad invalidation
policy prioritizes correctness across instances and both SQL/API write paths.

Explicit migration commands (DATABASE_URL must be provided securely; CLI never
loads a tracked .env), from backend:

```powershell
npm run build
npm run migrate:project-deadlines -- --dry-run
npm run migrate:project-deadlines -- --apply
```

Back up and verify on staging before production. Dry-run rolls back each new
migration independently. Do not delete history/ledgers for an application rollback.

Verification:

```powershell
npm run build
npm run test:projects
npm run test:workflow
node node_modules/typescript/bin/tsc --noEmit
npm run lint
```

Integration tests use the existing isolated PGlite tooling from the frontend
workspace's ignored `.qa-test-tools/`, or `PGLITE_MODULE`. They never load .env or
initialize a configured production database. A fresh workspace can install the
optional test tool with `npm install --prefix .qa-test-tools --no-save
@electric-sql/pglite` from the frontend root. Coverage includes nullable creation,
HTTP validation/permissions, migrations, reassignment/removal, UTC conversion,
delivery uniqueness/restarts, failure rollback/retry, recipient-only notifications/
SSE, revision rollback semantics, and scheduler lifecycle. Existing workflow
tests remain unchanged. Repository-wide lint has pre-existing floating-promise
failures in startup and the older workflow tests; focused project checks pass.
