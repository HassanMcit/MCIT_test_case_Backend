-- Supabase SQL Editor only. SELECTs inside an enforced READ ONLY transaction.
-- No repair, import, cleanup, grants, migrations or sequence operations.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '15s';
SET LOCAL TIME ZONE 'UTC';

SELECT count(*)::int AS case_count,
  md5(string_agg(md5(to_jsonb(tc)::text), '' ORDER BY id)) AS case_fingerprint
FROM public.test_cases tc; -- Expected baseline: 73. Save fingerprint privately.
SELECT id,"testId",module,"pageName","projectId","testerId","createdAt","updatedAt",
  md5(to_jsonb(tc)::text) AS fingerprint
FROM public.test_cases tc WHERE id=107; -- Preserve TC-0004, project14, tester3515.
SELECT id,name,application FROM public.projects WHERE id=14 OR name='Testing Garage System';
SELECT u.id,u.name,u.role,pa."projectId"
FROM public.users u LEFT JOIN public.project_assignments pa ON pa."userId"=u.id AND pa."projectId"=14
WHERE u.id IN (1,3515) OR u.name IN ('Alaa Eldin Mohsen','Hassan Ali') ORDER BY u.id;
SELECT name FROM public.schema_migrations ORDER BY name;
-- Presence of this marker indicates that the unsafe seed transaction committed.
-- Absence alone cannot rule out writes from other versions or manual operations.
SELECT name FROM public.schema_migrations WHERE name='20261105_garage_workbook_seed_v1';
SELECT id,"testId","pageName","projectId","testerId","createdAt","updatedAt"
FROM public.test_cases
WHERE "projectId"=14 OR lower(trim(module))='garage system'
 OR "testId" ~ '^TC_0(0[1-9]|[1-4][0-9]|5[01])$'
ORDER BY id;

-- Metadata-table presence is known; inspect its actual definition, not just the ledger.
SELECT column_name,data_type,is_nullable,column_default
FROM information_schema.columns WHERE table_schema='public' AND table_name='test_case_imports'
ORDER BY ordinal_position;
SELECT conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint
WHERE conrelid='public.test_case_imports'::regclass ORDER BY conname;
SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='test_case_imports';
SELECT c.relrowsecurity,c.relforcerowsecurity,pg_get_userbyid(c.relowner) AS table_owner
FROM pg_class c WHERE c.oid='public.test_case_imports'::regclass;
SELECT policyname,roles,cmd,qual,with_check FROM pg_policies
WHERE schemaname='public' AND tablename='test_case_imports'; -- Expected: zero policies.
SELECT grantee,privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name='test_case_imports' ORDER BY grantee,privilege_type;
SELECT r.rolname,has_table_privilege(r.oid,'public.test_case_imports','SELECT') AS can_select,
 has_table_privilege(r.oid,'public.test_case_imports','INSERT') AS can_insert,
 has_table_privilege(r.oid,'public.test_case_imports','UPDATE') AS can_update,
 has_table_privilege(r.oid,'public.test_case_imports','DELETE') AS can_delete
FROM pg_roles r WHERE r.rolname IN ('anon','authenticated');
-- Client roles must not access provenance data. RLS enabled with zero policies denies rows.
SELECT "sourceKey","batchHash",count(*)::int,min("importedAt"),max("importedAt")
FROM public.test_case_imports GROUP BY "sourceKey","batchHash";
SELECT "projectId","testId",count(*) FROM public.test_cases
GROUP BY "projectId","testId" HAVING count(*)>1;
SELECT "projectId","sourceKey","sourceTestId",count(*) FROM public.test_case_imports
GROUP BY "projectId","sourceKey","sourceTestId" HAVING count(*)>1;

ROLLBACK;
-- TLS in this SQL Editor session does NOT attest to the separate Render connection.
-- Backup availability/retention/recovery must be checked in Supabase dashboard.
