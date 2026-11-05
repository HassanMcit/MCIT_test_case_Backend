-- Phase 1 only. Run in the correct production Supabase project's SQL Editor.
-- Kept with the backend so validation works in a standalone backend checkout.
-- SELECT-only baseline: no migration, import, permission or data changes.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL TIME ZONE 'UTC';

SELECT now() AS checked_at,
       to_regclass('public.test_cases') AS cases,
       to_regclass('public.test_cases_current') AS current_view,
       to_regclass('public.schema_migrations') AS migration_ledger,
       to_regclass('public.test_case_imports') AS provenance;

-- Save this ID list and fingerprint privately. Later compare ONLY these IDs
-- after release/import; new rows should not alter the existing-row fingerprint.
SELECT count(*)::int AS existing_case_count,
       array_agg(id ORDER BY id) AS existing_case_ids,
       md5(string_agg(md5(to_jsonb(tc)::text), '' ORDER BY id)) AS existing_content_fingerprint
FROM public.test_cases tc;

SELECT id, name, application
FROM public.projects WHERE name = 'Testing Garage System';

SELECT id, name, role FROM public.users
WHERE name IN ('Alaa Eldin Mohsen', 'Hassan Ali') ORDER BY name, id;

SELECT pa."projectId",pa."userId",u.name,u.role FROM public.project_assignments pa
JOIN public.projects p ON p.id=pa."projectId" JOIN public.users u ON u.id=pa."userId"
WHERE p.name='Testing Garage System' AND u.name IN ('Alaa Eldin Mohsen','Hassan Ali');

SELECT p.id AS project_id, p.name, p.application, tc.module,
       u.id AS owner_id, u.name AS owner, count(*)::int AS case_count
FROM public.test_cases tc JOIN public.projects p ON p.id = tc."projectId"
LEFT JOIN public.users u ON u.id = tc."testerId"
WHERE p.name = 'Testing Garage System'
GROUP BY p.id, p.name, p.application, tc.module, u.id, u.name;

SELECT tc."testId", count(*)::int AS duplicates
FROM public.test_cases tc JOIN public.projects p ON p.id = tc."projectId"
WHERE p.name = 'Testing Garage System' AND tc."testId" ~ '^TC_0[0-9]{2}$'
GROUP BY tc."testId" HAVING count(*) > 1;

SELECT c.relrowsecurity AS provenance_rls,
       pg_get_userbyid(c.relowner) AS provenance_owner,
       (SELECT count(*) FROM pg_policy pol WHERE pol.polrelid = c.oid) AS client_policies
FROM pg_class c WHERE c.oid = to_regclass('public.test_case_imports');

ROLLBACK;

-- Run this separate SELECT only if migration_ledger above is not NULL:
SELECT name FROM public.schema_migrations
WHERE name IN ('20261025_execution_workflow_v1',
               '20261104_project_deadlines_v1',
               '20261104_cache_revision_v1',
               '20261105_test_case_imports_v1') ORDER BY name;

-- SQL Editor privileges do not establish the Render connection role's rights.
-- Check that runtime role separately inside the existing Render service.
