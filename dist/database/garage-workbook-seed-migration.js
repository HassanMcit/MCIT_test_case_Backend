"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GARAGE_WORKBOOK_SEED_MIGRATION = void 0;
exports.migrateGarageWorkbookSeed = migrateGarageWorkbookSeed;
const node_crypto_1 = require("node:crypto");
const garage_workbook_data_1 = require("./garage-workbook-data");
exports.GARAGE_WORKBOOK_SEED_MIGRATION = '20261105_garage_workbook_seed_v1';
const SOURCE_KEY = 'garage-system-testing-report-v1';
const TARGET_PROJECT = 'Testing Garage System';
const TARGET_APPLICATION = 'Garage System';
const sha256 = (value) => (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(value)).digest('hex');
function prepareRows() {
    return garage_workbook_data_1.GARAGE_WORKBOOK_ROWS.map((row, index) => {
        const original = row.original;
        const testId = `TC_${String(index + 1).padStart(3, '0')}`;
        const status = original.Status === 'Pass' ? 'passed' : 'failed';
        const plannedAt = index < 30
            ? new Date(Date.UTC(2026, 10, 5, 7, index * 5)).toISOString()
            : null;
        return {
            original,
            testId,
            sourceRow: index + 1,
            rowHash: sha256(original),
            status,
            plannedAt,
        };
    });
}
async function migrateGarageWorkbookSeed(pool, dryRun = false) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(20261105, 2)');
        const tablesRes = await client.query(`
      SELECT
        to_regclass('public.projects') AS projects_tbl,
        to_regclass('public.users') AS users_tbl,
        to_regclass('public.test_cases') AS tc_tbl,
        to_regclass('public.test_case_imports') AS imports_tbl
    `);
        const tbls = tablesRes.rows[0] || {};
        if (!tbls.projects_tbl ||
            !tbls.users_tbl ||
            !tbls.tc_tbl ||
            !tbls.imports_tbl) {
            await client.query('ROLLBACK');
            return {
                migration: exports.GARAGE_WORKBOOK_SEED_MIGRATION,
                skipped: true,
                reason: 'missing_tables',
            };
        }
        const projRes = await client.query(`SELECT id, name, application FROM projects WHERE regexp_replace(lower(btrim(name)), '\\s+', ' ', 'g') = lower($1) ORDER BY id ASC LIMIT 1 FOR UPDATE`, [TARGET_PROJECT]);
        if (!projRes.rowCount) {
            await client.query('ROLLBACK');
            return {
                migration: exports.GARAGE_WORKBOOK_SEED_MIGRATION,
                skipped: true,
                reason: 'missing_project',
            };
        }
        const project = projRes.rows[0];
        if (project.name !== TARGET_PROJECT ||
            project.application !== TARGET_APPLICATION) {
            await client.query(`UPDATE projects SET name = $1, application = $2, "updatedAt" = NOW() WHERE id = $3`, [TARGET_PROJECT, TARGET_APPLICATION, project.id]);
            project.name = TARGET_PROJECT;
            project.application = TARGET_APPLICATION;
        }
        const usersRes = await client.query(`SELECT id, name, role FROM users WHERE regexp_replace(lower(btrim(name)), '\\s+', ' ', 'g') IN ('alaa eldin mohsen', 'hassan ali') ORDER BY id ASC FOR UPDATE`);
        const alaa = usersRes.rows.find((u) => u.name.trim().replace(/\s+/g, ' ').toLowerCase() ===
            'alaa eldin mohsen');
        const hassan = usersRes.rows.find((u) => u.name.trim().replace(/\s+/g, ' ').toLowerCase() === 'hassan ali');
        if (!alaa || !hassan) {
            await client.query('ROLLBACK');
            return {
                migration: exports.GARAGE_WORKBOOK_SEED_MIGRATION,
                skipped: true,
                reason: 'missing_owners',
            };
        }
        if (alaa.name !== 'Alaa Eldin Mohsen') {
            await client.query(`UPDATE users SET name = $1 WHERE id = $2`, [
                'Alaa Eldin Mohsen',
                alaa.id,
            ]);
            alaa.name = 'Alaa Eldin Mohsen';
        }
        if (hassan.name !== 'Hassan Ali') {
            await client.query(`UPDATE users SET name = $1 WHERE id = $2`, [
                'Hassan Ali',
                hassan.id,
            ]);
            hassan.name = 'Hassan Ali';
        }
        await client.query(`INSERT INTO project_assignments ("projectId", "userId")
       VALUES ($1, $2), ($1, $3)
       ON CONFLICT ("userId", "projectId") DO NOTHING`, [project.id, alaa.id, hassan.id]);
        const hasExecutionsTable = (await client.query(`SELECT to_regclass('public.test_executions') AS t`)).rows[0]?.t;
        const hasCycleItemsTable = (await client.query(`SELECT to_regclass('public.test_cycle_items') AS t`)).rows[0]?.t;
        const strayRowsRes = await client.query(`SELECT tc.id, tc."testId", tc."projectId", tc.module
       FROM test_cases tc
       LEFT JOIN test_case_imports i ON i."testCaseId" = tc.id
       WHERE i."testCaseId" IS NULL
         AND (tc."projectId" = $1 OR LOWER(TRIM(COALESCE(tc.module, ''))) = LOWER($2))`, [project.id, TARGET_APPLICATION]);
        let removedStrayCount = 0;
        let reassignedStrayCount = 0;
        for (const stray of strayRowsRes.rows) {
            let hasCycleHistory = false;
            if (hasCycleItemsTable) {
                const ci = await client.query(`SELECT 1 FROM test_cycle_items WHERE "testCaseId" = $1 LIMIT 1`, [stray.id]);
                hasCycleHistory = (ci.rowCount ?? 0) > 0;
            }
            if (!hasCycleHistory) {
                if (hasExecutionsTable) {
                    await client.query(`DELETE FROM test_executions WHERE "testCaseId" = $1 AND "cycleItemId" IS NULL`, [stray.id]);
                }
                await client.query(`DELETE FROM test_cases WHERE id = $1`, [stray.id]);
                removedStrayCount++;
            }
            else if (stray.projectId !== project.id) {
                await client.query(`UPDATE test_cases SET "projectId" = $1, module = $2, "updatedAt" = NOW() WHERE id = $3`, [project.id, TARGET_APPLICATION, stray.id]);
                reassignedStrayCount++;
            }
        }
        const validatedRows = prepareRows();
        const batchHash = sha256(validatedRows.map((r) => r.original));
        let insertedCount = 0;
        let updatedCount = 0;
        for (const [index, row] of validatedRows.entries()) {
            const ownerId = index < 30 ? alaa.id : hassan.id;
            const o = row.original;
            const existingImportRes = await client.query(`SELECT i."testCaseId", tc.id AS tc_id
         FROM test_case_imports i
         JOIN test_cases tc ON tc.id = i."testCaseId"
         WHERE i."projectId" = $1 AND i."sourceKey" = $2 AND i."sourceTestId" = $3
         LIMIT 1`, [project.id, SOURCE_KEY, row.testId]);
            if (existingImportRes.rowCount) {
                const tcId = existingImportRes.rows[0].tc_id;
                await client.query(`UPDATE test_cases
           SET "testId" = $1,
               module = $2,
               "pageName" = $3,
               scenario = $4,
               "preConditions" = $5,
               steps = $6,
               "expectedResult" = $7,
               "actualResult" = $8,
               status = $9,
               "testerId" = $10,
               "projectId" = $11,
               "executedAt" = NULL,
               notes = NULL
           WHERE id = $12`, [
                    row.testId,
                    TARGET_APPLICATION,
                    o.Module,
                    o['Test Scenario'],
                    o['Pre-Conditions'],
                    JSON.stringify([o['Test Steps']]),
                    o['Expected Result'],
                    o['Actual Result'],
                    row.status,
                    ownerId,
                    project.id,
                    tcId,
                ]);
                await client.query(`UPDATE test_case_imports
           SET "sourceRow" = $1,
               "rowHash" = $2,
               "batchHash" = $3,
               original = $4,
               "plannedAt" = $5,
               "plannedTimezone" = $6,
               "importedById" = $7
           WHERE "testCaseId" = $8`, [
                    row.sourceRow,
                    row.rowHash,
                    batchHash,
                    JSON.stringify(o),
                    row.plannedAt,
                    row.plannedAt ? 'Africa/Cairo' : null,
                    hassan.id,
                    tcId,
                ]);
                updatedCount++;
            }
            else {
                const existingTcRes = await client.query(`SELECT id FROM test_cases WHERE "projectId" = $1 AND "testId" = $2 LIMIT 1`, [project.id, row.testId]);
                let tcId;
                if (existingTcRes.rowCount) {
                    tcId = existingTcRes.rows[0].id;
                    await client.query(`UPDATE test_cases
             SET module = $1,
                 "pageName" = $2,
                 scenario = $3,
                 "preConditions" = $4,
                 steps = $5,
                 "expectedResult" = $6,
                 "actualResult" = $7,
                 status = $8,
                 "testerId" = $9,
                 "projectId" = $10,
                 "executedAt" = NULL,
                 notes = NULL
             WHERE id = $11`, [
                        TARGET_APPLICATION,
                        o.Module,
                        o['Test Scenario'],
                        o['Pre-Conditions'],
                        JSON.stringify([o['Test Steps']]),
                        o['Expected Result'],
                        o['Actual Result'],
                        row.status,
                        ownerId,
                        project.id,
                        tcId,
                    ]);
                    if (hasExecutionsTable) {
                        await client.query(`DELETE FROM test_executions WHERE "testCaseId" = $1 AND "cycleItemId" IS NULL`, [tcId]);
                    }
                }
                else {
                    const inserted = await client.query(`INSERT INTO test_cases
             ("testId", module, "pageName", scenario, "preConditions", steps, "expectedResult", "actualResult", status, "testerId", "projectId")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id`, [
                        row.testId,
                        TARGET_APPLICATION,
                        o.Module,
                        o['Test Scenario'],
                        o['Pre-Conditions'],
                        JSON.stringify([o['Test Steps']]),
                        o['Expected Result'],
                        o['Actual Result'],
                        row.status,
                        ownerId,
                        project.id,
                    ]);
                    tcId = inserted.rows[0].id;
                }
                await client.query(`INSERT INTO test_case_imports
           ("testCaseId", "projectId", "sourceKey", "sourceTestId", "sourceRow", "rowHash", "batchHash", original, "plannedAt", "plannedTimezone", "importedById")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [
                    tcId,
                    project.id,
                    SOURCE_KEY,
                    row.testId,
                    row.sourceRow,
                    row.rowHash,
                    batchHash,
                    JSON.stringify(o),
                    row.plannedAt,
                    row.plannedAt ? 'Africa/Cairo' : null,
                    hassan.id,
                ]);
                insertedCount++;
            }
        }
        const hasCacheTable = (await client.query(`SELECT to_regclass('public.app_cache_revision') AS t`)).rows[0]?.t;
        if (hasCacheTable &&
            (insertedCount > 0 ||
                updatedCount > 0 ||
                removedStrayCount > 0 ||
                reassignedStrayCount > 0)) {
            await client.query(`UPDATE app_cache_revision SET revision = revision + 1 WHERE id = 1`);
        }
        await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
        await client.query(`INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [exports.GARAGE_WORKBOOK_SEED_MIGRATION]);
        await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
        return {
            migration: exports.GARAGE_WORKBOOK_SEED_MIGRATION,
            projectId: project.id,
            projectName: project.name,
            application: project.application,
            insertedCount,
            updatedCount,
            removedStrayCount,
            reassignedStrayCount,
            batchHash,
        };
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
//# sourceMappingURL=garage-workbook-seed-migration.js.map