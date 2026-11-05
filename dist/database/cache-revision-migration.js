"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateCacheRevision = migrateCacheRevision;
async function migrateCacheRevision(pool, dryRun = false) {
    const client = await pool.connect();
    const migration = '20261104_cache_revision_v1';
    try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(20261104, 2)');
        const existing = await client.query('SELECT 1 FROM schema_migrations WHERE name=$1', [migration]);
        if (!existing.rowCount) {
            await client.query(`
        CREATE TABLE app_cache_revision (id INTEGER PRIMARY KEY CHECK(id=1), revision BIGINT NOT NULL DEFAULT 1);
        INSERT INTO app_cache_revision(id) VALUES(1);
        CREATE FUNCTION bump_app_cache_revision() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN UPDATE app_cache_revision SET revision=revision+1 WHERE id=1; RETURN NULL; END $$;
      `);
            for (const table of [
                'projects',
                'project_assignments',
                'users',
                'test_cases',
                'releases',
                'test_cycles',
                'test_cycle_items',
                'test_executions',
                'quality_applications',
                'quality_checklists',
            ]) {
                await client.query(`CREATE TRIGGER cache_revision_changed AFTER INSERT OR UPDATE OR DELETE ON ${table} FOR EACH STATEMENT EXECUTE FUNCTION bump_app_cache_revision()`);
            }
            await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [
                migration,
            ]);
        }
        await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
        return { migration, alreadyApplied: !!existing.rowCount, dryRun };
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
//# sourceMappingURL=cache-revision-migration.js.map