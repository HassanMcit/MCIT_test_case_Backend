// DATABASE_URL must be explicitly provided; never load a committed environment file.
const { Pool } = require('pg');
const { migrateWorkflow } = require('../dist/database/workflow-migration');
if (!process.env.DATABASE_URL)
  throw new Error('Provide DATABASE_URL for the intended database');
const dryRun = process.argv.includes('--dry-run');
if (!dryRun && !process.argv.includes('--apply'))
  throw new Error('Choose --dry-run (rollback) or --apply');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
migrateWorkflow(pool, dryRun)
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
