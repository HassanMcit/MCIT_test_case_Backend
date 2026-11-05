# Garage startup safety hotfix

No production actions have been performed by this hotfix. Base: failed commit
125295519bd611fb542218ce67e6519bce92faef. Use this isolated hotfix branch;
do not deploy the later DI-only change while it still executes the destructive seed.

## Failure and data safety

The cold-load cycle was DatabaseService -> garage-workbook-seed-migration ->
GarageImportService -> DatabaseService. Nest received undefined constructor metadata
for GarageImportService parameter 0. Type checking and service-first test imports
masked the runtime error. A real `dist/main.js` process now starts against an isolated
PostgreSQL fixture and serves authenticated HTTP requests.

The seed and embedded workbook are removed entirely, including compiled artifacts.
No automatic DDL, bootstrap administrator seeding, project reassignment, cleanup,
test import or execution rewriting remains in DatabaseService initialization.
Startup checks the existing provenance schema, ledger and RLS in a READ ONLY transaction.
An unprepared database causes startup failure, without automatic repair.
The deadline notification worker is disabled by default. Only explicitly configuring
ENABLE_PROJECT_DEADLINE_WORKER=true enables its existing 30-second background scans;
there is no immediate startup scan. No production environment settings were changed.
All import/status/verification endpoints require JWT authentication and the current
database administrator role. Possible content duplicates block commit and are included
in the previewHash; this is conservative text similarity requiring human review,
not proof that two differently worded cases have identical meaning. Records are never merged.

The reproduced DI failure precedes lifecycle hooks, so that reproduced attempt did
not execute the seed. Other attempts cannot be ruled out without production evidence.
The removed seed used a transaction: a pre-COMMIT failure rolls back table writes,
although PostgreSQL sequence gaps can remain. Its successful runs could delete or
overwrite existing records; its migration marker alone does not restore them.

## Read-only verification, compatible with Render Free

In the correct Supabase project select SQL Editor -> New query, paste the whole
`scripts/failed-startup-audit.sql`, then Run. It contains SELECTs, SET LOCAL and
an enforced READ ONLY transaction ending with ROLLBACK. Save non-sensitive results.
Confirm 73 cases, case107 TC-0004 unchanged (including audit timestamps), project14
Testing Garage System / Garage System, user3515 Alaa and user1 Hassan, memberships,
and no incoming TC_001..TC_051. Inspect any unsafe seed marker or import provenance.
Compare the actual columns, FK/check/unique constraints and indexes with
`src/database/test-case-import-migration.ts`; require RLS enabled and no client policies.
Review explicit anon/authenticated grants. The runtime database role must be the
table owner or a privileged backend-only role, never a browser credential.
Do not reapply the existing 20261105_test_case_imports_v1 migration. If schema or
security differs, stop and prepare a separately reviewed corrective migration.

In Supabase -> Database -> Backups (dashboard placement may vary), verify an actual
available recovery point, retention, recovery method and restore permissions. A free
plan does not imply managed backups exist. If none exists, an approved secure logical
backup using an authorized provider workflow is a release blocker; never share its
contents or database credentials in chat. Counts and hashes do not replace a backup.
SQL Editor cannot verify Render's TLS peer validation or its runtime role. These remain
provider/runtime checks; do not infer them from a SQL Editor connection.

## Release gates and rollback

1. Record the current Live Render deployment commit and service branch under service
   Events / Settings. Confirm a last-known-good rollback artifact and verified backup.
   A public HTTP response cannot establish which commit is Live.
2. Review the SQL baseline and schema/RLS results. No new migration is required by this
   source-only hotfix when the existing schema matches. A mismatch requires separate approval.
3. Obtain explicit approval to promote/deploy this corrected commit. Do not push main
   or invoke Render deployment automatically. Render build: `npm ci && npm run build`;
   start: `npm run start:prod`, matching the existing service root configuration.
4. After the approved deploy, verify Live SHA/logs, login, existing 73 cases and case107,
   project CRUD permissions, CORS, and anonymous401/tester403 on import/status endpoints.
   If startup checks fail, stop; do not weaken RLS or rerun migrations blindly.
5. Backend rollback must select a known-good artifact preceding1252955 with no unsafe
   seed. Never roll back to1252955 or a DI-only fix that retains that seed. No schema
   rollback or data deletion is necessary for this hotfix. Restore data only under
   a separately approved recovery procedure if forensic checks show damage.
6. Frontend is unchanged by this hotfix. No Vercel redeploy is required for it.

## Separately approved import

Use the existing admin-authenticated frontend/API and the workbook without `(1)`.
Follow `docs/garage-bulk-import.md`; POST `/api/test-cases/bulk-import/garage`
with `dryRun:true` and the reviewed 51 original rows. No shell or local PostgreSQL
connection is needed. Review actual project14 / Garage System, owner3515 for30,
owner1 for21, all exact Module->pageName values, source fields, conflicts and
semanticDuplicates (especially case107). Save actual previewHash and canCommit.
If any possible duplicate exists, stop for review; never delete TC-0004 or override
the guard to force51. Do not fabricate a previewHash or token.
Wait for separate explicit import approval before sending `dryRun:false` with that
previewHash. Verify database records, authenticated verification API and browser after
commit, preserve the saved existing-row fingerprints, and invalidate caches using the
existing frontend import flow. No production preview or import has been run here.

## Local validation

`npm run build`, `npm run lint`, `npm run test:release`.
Integration tests use isolated PostgreSQL WASM via PGLITE_MODULE; no production data.
The full entrypoint test verifies zero startup mutation statements and unchanged
snapshots of all73 test cases, users, projects, assignments, migration ledger,
provenance and cache revision; it also exercises real login and authorization.
