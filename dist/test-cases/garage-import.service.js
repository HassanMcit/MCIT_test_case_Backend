"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GarageImportService = exports.GARAGE_HEADERS = void 0;
exports.garageRows = garageRows;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const database_service_1 = require("../database/database.service");
exports.GARAGE_HEADERS = [
    'Test Case ID',
    'Module',
    'Test Scenario',
    'Pre-Conditions',
    'Test Steps',
    'Expected Result',
    'Actual Result',
    'Status',
    'Defect ID',
    'Tester',
    'Execution Date',
];
const SOURCE = 'garage-system-testing-report-v1';
const PROJECT = 'Testing Garage System';
const APPLICATION = 'Garage System';
const OWNERS = ['Alaa Eldin Mohsen', 'Hassan Ali'];
const hash = (value) => (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(value)).digest('hex');
function garageRows(dto) {
    if (!dto ||
        typeof dto.dryRun !== 'boolean' ||
        !Array.isArray(dto.rows) ||
        dto.rows.length !== 51)
        throw new common_1.BadRequestException('Exactly 51 rows and a boolean dryRun are required');
    let size = 0;
    return dto.rows.map((row, index) => {
        const raw = row?.original;
        if (!raw ||
            Object.keys(raw).length !== exports.GARAGE_HEADERS.length ||
            exports.GARAGE_HEADERS.some((k) => !(k in raw)))
            throw new common_1.BadRequestException(`Row ${index + 1}: all 11 original Excel columns are required`);
        const original = {};
        for (const key of exports.GARAGE_HEADERS) {
            const value = raw[key];
            if (value !== null &&
                (typeof value !== 'string' ||
                    value.includes('\0') ||
                    value.length > 100000))
                throw new common_1.BadRequestException(`Row ${index + 1}: invalid ${key}`);
            size += value?.length || 0;
            original[key] = value;
        }
        if (size > 1000000)
            throw new common_1.BadRequestException('Workbook text exceeds the import limit');
        const testId = `TC_${String(index + 1).padStart(3, '0')}`;
        if (original['Test Case ID'] !== testId)
            throw new common_1.BadRequestException(`Row ${index + 1}: expected ${testId}; IDs must be unique and in original order`);
        for (const key of [
            'Module',
            'Test Scenario',
            'Test Steps',
            'Expected Result',
        ])
            if (!original[key]?.trim())
                throw new common_1.BadRequestException(`${testId}: ${key} must not be empty`);
        const status = original.Status === 'Pass'
            ? 'passed'
            : original.Status === 'Fail'
                ? 'failed'
                : null;
        if (!status)
            throw new common_1.BadRequestException(`${testId}: expected original Status Pass or Fail`);
        const plannedAt = index < 30
            ? new Date(Date.UTC(2026, 10, 5, 7, index * 5)).toISOString()
            : null;
        if (plannedAt &&
            new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Africa/Cairo',
                hour: '2-digit',
                minute: '2-digit',
                hourCycle: 'h23',
            }).format(new Date(plannedAt)) !==
                `${String(9 + Math.floor((index * 5) / 60)).padStart(2, '0')}:${String((index * 5) % 60).padStart(2, '0')}`)
            throw new common_1.BadRequestException('Runtime Africa/Cairo timezone rules do not match the requested plan');
        return {
            original,
            testId,
            sourceRow: index + 1,
            rowHash: hash(original),
            status,
            ownerName: OWNERS[index < 30 ? 0 : 1],
            plannedAt,
        };
    });
}
let GarageImportService = class GarageImportService {
    constructor(database) {
        this.database = database;
    }
    admin(user) {
        if (!user?.id || user.role !== 'admin')
            throw new common_1.ForbiddenException('Administrator access required');
    }
    matches(tc, metadata, row, projectId, ownerId, batchHash) {
        return (metadata &&
            metadata.sourceKey === SOURCE &&
            metadata.batchHash === batchHash &&
            metadata.rowHash === row.rowHash &&
            hash(Object.fromEntries(exports.GARAGE_HEADERS.map((k) => [k, metadata.original[k]]))) === row.rowHash &&
            metadata.projectId === projectId &&
            metadata.sourceTestId === row.testId &&
            metadata.sourceRow === row.sourceRow &&
            (metadata.plannedAt
                ? new Date(metadata.plannedAt).toISOString()
                : null) === row.plannedAt &&
            metadata.plannedTimezone === (row.plannedAt ? 'Africa/Cairo' : null) &&
            tc.testId === row.testId &&
            tc.projectId === projectId &&
            tc.testerId === ownerId &&
            tc.module === APPLICATION &&
            tc.pageName === row.original.Module &&
            tc.scenario === row.original['Test Scenario'] &&
            tc.preConditions === row.original['Pre-Conditions'] &&
            tc.steps === JSON.stringify([row.original['Test Steps']]) &&
            tc.expectedResult === row.original['Expected Result'] &&
            tc.actualResult === row.original['Actual Result'] &&
            tc.status === row.status &&
            tc.executedAt === null &&
            tc.notes === null &&
            tc.visible_owner_id === ownerId &&
            tc.visible_status === row.status &&
            tc.visible_actual === row.original['Actual Result']);
    }
    async run(dto, user) {
        this.admin(user);
        const rows = garageRows(dto);
        const batchHash = hash(rows.map((r) => r.original));
        if (!dto.dryRun && !/^[a-f0-9]{64}$/.test(dto.previewHash || ''))
            throw new common_1.BadRequestException('Commit requires the previewHash from a successful dry run');
        const db = await this.database.db.connect();
        try {
            await db.query(dto.dryRun
                ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'
                : 'BEGIN');
            await db.query(`SET LOCAL statement_timeout = '15s'`);
            await db.query(`SET LOCAL lock_timeout = '5s'`);
            const lock = dto.dryRun ? '' : ' FOR SHARE';
            const projects = (await db.query(`SELECT id,name,application FROM projects WHERE name=$1${lock}`, [PROJECT])).rows;
            if (projects.length !== 1 || projects[0].application !== APPLICATION)
                throw new common_1.ConflictException('Exactly one existing Testing Garage System project with application Garage System is required');
            const project = projects[0];
            const globalCollisions = await db.query(`SELECT tc."testId" FROM test_cases tc
        WHERE tc."projectId" IS DISTINCT FROM $1 AND tc."testId"=ANY($2::text[])
        AND EXISTS (
          SELECT 1 FROM pg_index ix JOIN pg_attribute a ON a.attrelid=ix.indrelid AND a.attnum=ix.indkey[0]
          WHERE ix.indrelid='test_cases'::regclass AND ix.indisunique AND ix.indnkeyatts=1
            AND ix.indpred IS NULL AND a.attname='testId'
        )`, [project.id, rows.map((row) => row.testId)]);
            if (globalCollisions.rowCount)
                throw new common_1.ConflictException('The live schema has globally unique test IDs that conflict with another project. Review a project-scoped uniqueness migration before importing');
            const users = (await db.query(`SELECT id,name,role FROM users WHERE name=ANY($1::text[])${lock}`, [OWNERS])).rows;
            const owners = OWNERS.map((name) => {
                const found = users.filter((u) => u.name === name);
                if (found.length !== 1)
                    throw new common_1.ConflictException(`Resolve exactly one existing user named ${name}`);
                return found[0];
            });
            const assignments = (await db.query(`SELECT "userId" FROM project_assignments WHERE "projectId"=$1 AND "userId"=ANY($2::int[])${lock}`, [project.id, owners.map((o) => o.id)])).rows;
            for (const owner of owners)
                if (owner.role !== 'admin' &&
                    !assignments.some((a) => a.userId === owner.id))
                    throw new common_1.ConflictException(`${owner.name} must already be assigned to the target project`);
            if (!dto.dryRun)
                await db.query('SELECT pg_advisory_xact_lock(20261105, $1)', [
                    project.id,
                ]);
            const existing = (await db.query(`SELECT tc.*,to_jsonb(i) AS import_metadata,
        visible."testerId" AS visible_owner_id,visible.status AS visible_status,visible."actualResult" AS visible_actual
        FROM test_cases tc
        LEFT JOIN test_case_imports i ON i."testCaseId"=tc.id
        LEFT JOIN test_cases_current visible ON visible.id=tc.id
        WHERE (tc."projectId"=$1 AND tc."testId"=ANY($2::text[]))
          OR (i."projectId"=$1 AND i."sourceKey"=$3 AND i."sourceTestId"=ANY($2::text[]))
        ORDER BY tc.id${dto.dryRun ? '' : ' FOR UPDATE OF tc'}`, [project.id, rows.map((r) => r.testId), SOURCE])).rows;
            const conflicts = [];
            const plan = rows.map((row, index) => {
                const owner = owners[index < 30 ? 0 : 1];
                const found = existing.filter((tc) => tc.testId === row.testId ||
                    tc.import_metadata?.sourceTestId === row.testId);
                const unchanged = found.length === 1 &&
                    this.matches(found[0], found[0].import_metadata, row, project.id, owner.id, batchHash);
                if (found.length && !unchanged)
                    conflicts.push(row.testId);
                return {
                    testId: row.testId,
                    sourceRow: row.sourceRow,
                    ownerId: owner.id,
                    ownerName: owner.name,
                    pageName: row.original.Module,
                    plannedAt: row.plannedAt,
                    plannedTimezone: row.plannedAt ? 'Africa/Cairo' : null,
                    action: found.length ? (unchanged ? 'skip' : 'conflict') : 'insert',
                    databaseId: found[0]?.id ?? null,
                };
            });
            const previewHash = hash({ batchHash, project, owners, plan });
            const result = {
                dryRun: dto.dryRun,
                batchHash,
                previewHash,
                project,
                application: APPLICATION,
                total: 51,
                assignments: owners.map((o, i) => ({
                    id: o.id,
                    name: o.name,
                    count: i === 0 ? 30 : 21,
                })),
                wouldInsert: plan.filter((r) => r.action === 'insert').length,
                skipped: plan.filter((r) => r.action === 'skip').length,
                conflicts,
                canCommit: conflicts.length === 0,
                plan,
            };
            if (dto.dryRun) {
                await db.query('ROLLBACK');
                return result;
            }
            if (conflicts.length)
                throw new common_1.ConflictException({
                    message: 'Existing test cases differ; nothing was overwritten',
                    conflicts,
                });
            if (dto.previewHash !== previewHash)
                throw new common_1.ConflictException('Preview is stale. Run dry-run again and review the new mappings');
            for (const [index, row] of rows.entries()) {
                if (plan[index].action === 'skip')
                    continue;
                const o = row.original;
                const inserted = await db.query(`INSERT INTO test_cases
          ("testId",module,"pageName",scenario,"preConditions",steps,"expectedResult","actualResult",status,"testerId","projectId")
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`, [
                    row.testId,
                    APPLICATION,
                    o.Module,
                    o['Test Scenario'],
                    o['Pre-Conditions'],
                    JSON.stringify([o['Test Steps']]),
                    o['Expected Result'],
                    o['Actual Result'],
                    row.status,
                    plan[index].ownerId,
                    project.id,
                ]);
                await db.query(`INSERT INTO test_case_imports
          ("testCaseId","projectId","sourceKey","sourceTestId","sourceRow","rowHash","batchHash",original,"plannedAt","plannedTimezone","importedById")
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [
                    inserted.rows[0].id,
                    project.id,
                    SOURCE,
                    row.testId,
                    row.sourceRow,
                    row.rowHash,
                    batchHash,
                    JSON.stringify(o),
                    row.plannedAt,
                    row.plannedAt ? 'Africa/Cairo' : null,
                    user.id,
                ]);
            }
            const verification = await this.verifyWith(db, batchHash);
            if (!verification.verified)
                throw new common_1.ConflictException('Persisted data does not match the source; import rolled back');
            const cache = (await db.query(result.wouldInsert > 0
                ? 'UPDATE app_cache_revision SET revision=revision+1 WHERE id=1 RETURNING revision::text'
                : 'SELECT revision::text FROM app_cache_revision WHERE id=1')).rows;
            await db.query('COMMIT');
            return {
                ...result,
                imported: result.wouldInsert,
                verified: true,
                verification,
                cacheRevision: cache[0]?.revision,
            };
        }
        catch (error) {
            await db.query('ROLLBACK');
            if (error.code === '23505')
                throw new common_1.ConflictException('Concurrent duplicate detected; entire import rolled back. Preview again');
            if (['55P03', '57014', '40001', '40P01'].includes(error.code))
                throw new common_1.ConflictException('Import was rolled back due to concurrent activity or timeout. Preview again');
            throw error;
        }
        finally {
            db.release();
        }
    }
    async verifyWith(db, batchHash) {
        const stored = (await db.query(`SELECT tc.*,to_jsonb(i) AS import_metadata,u.name AS owner_name,
      p.name AS project_name,p.application AS project_application,
      current_tc."testerId" AS visible_owner_id,current_tc.status AS visible_status,current_tc."actualResult" AS visible_actual
      FROM test_case_imports i JOIN test_cases tc ON tc.id=i."testCaseId"
      JOIN users u ON u.id=tc."testerId" JOIN projects p ON p.id=tc."projectId"
      JOIN test_cases_current current_tc ON current_tc.id=tc.id
      WHERE i."batchHash"=$1 AND i."sourceKey"=$2 ORDER BY i."sourceRow"`, [batchHash, SOURCE])).rows;
        if (stored.length !== 51)
            return {
                verified: false,
                total: stored.length,
                mismatches: ['Expected 51 persisted rows'],
            };
        const originals = stored.map((tc) => ({
            original: tc.import_metadata.original,
        }));
        const source = garageRows({ dryRun: true, rows: originals });
        const mismatches = source
            .filter((row, i) => {
            const tc = stored[i];
            return (!this.matches(tc, tc.import_metadata, row, tc.projectId, tc.testerId, batchHash) ||
                tc.owner_name !== row.ownerName ||
                tc.project_name !== PROJECT ||
                tc.project_application !== APPLICATION ||
                tc.visible_owner_id !== tc.testerId ||
                tc.visible_status !== row.status ||
                tc.visible_actual !== row.original['Actual Result']);
        })
            .map((r) => r.testId);
        const canonicalHash = hash(source.map((r) => r.original));
        return {
            verified: mismatches.length === 0 &&
                canonicalHash === batchHash &&
                new Set(stored.map((tc) => tc.projectId)).size === 1,
            total: stored.length,
            assignments: OWNERS.map((name) => ({
                name,
                count: stored.filter((tc) => tc.owner_name === name).length,
            })),
            mismatches,
            batchHash: canonicalHash,
            ids: stored.map((tc) => ({ id: tc.id, testId: tc.testId })),
        };
    }
    async verify(batchHash, user) {
        this.admin(user);
        if (!/^[a-f0-9]{64}$/.test(batchHash))
            throw new common_1.BadRequestException('Invalid batch hash');
        return this.verifyWith(this.database.db, batchHash);
    }
};
exports.GarageImportService = GarageImportService;
exports.GarageImportService = GarageImportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], GarageImportService);
//# sourceMappingURL=garage-import.service.js.map