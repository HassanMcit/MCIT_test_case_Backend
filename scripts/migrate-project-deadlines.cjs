// Explicit target only: never load .env. Apply after the existing workflow migration.
const { Pool } = require('pg');
const {
  migrateProjectDeadlines,
} = require('../dist/database/project-deadlines-migration');
const {
  migrateCacheRevision,
} = require('../dist/database/cache-revision-migration');
if (!process.env.DATABASE_URL)
  throw new Error('Provide DATABASE_URL for the intended database');
const dryRun = process.argv.includes('--dry-run');
if (!dryRun && !process.argv.includes('--apply'))
  throw new Error('Choose --dry-run or --apply');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  console.log(JSON.stringify(await migrateProjectDeadlines(pool, dryRun)));
  console.log(JSON.stringify(await migrateCacheRevision(pool, dryRun)));
})()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
