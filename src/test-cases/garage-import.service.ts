import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { GarageImportDto } from './dto/garage-import.dto';

export const GARAGE_HEADERS = [
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
type Actor = { id: number; role: string };
const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function garageRows(dto: GarageImportDto) {
  if (
    !dto ||
    typeof dto.dryRun !== 'boolean' ||
    !Array.isArray(dto.rows) ||
    dto.rows.length !== 51
  )
    throw new BadRequestException(
      'Exactly 51 rows and a boolean dryRun are required',
    );
  let size = 0;
  return dto.rows.map((row, index) => {
    const raw = row?.original;
    if (
      !raw ||
      Object.keys(raw).length !== GARAGE_HEADERS.length ||
      GARAGE_HEADERS.some((k) => !(k in raw))
    )
      throw new BadRequestException(
        `Row ${index + 1}: all 11 original Excel columns are required`,
      );
    const original: Record<string, string | null> = {};
    for (const key of GARAGE_HEADERS) {
      const value = raw[key];
      if (
        value !== null &&
        (typeof value !== 'string' ||
          value.includes('\0') ||
          value.length > 100000)
      )
        throw new BadRequestException(`Row ${index + 1}: invalid ${key}`);
      size += value?.length || 0;
      original[key] = value;
    }
    if (size > 1000000)
      throw new BadRequestException('Workbook text exceeds the import limit');
    const testId = `TC_${String(index + 1).padStart(3, '0')}`;
    if (original['Test Case ID'] !== testId)
      throw new BadRequestException(
        `Row ${index + 1}: expected ${testId}; IDs must be unique and in original order`,
      );
    for (const key of [
      'Module',
      'Test Scenario',
      'Test Steps',
      'Expected Result',
    ])
      if (!original[key]?.trim())
        throw new BadRequestException(`${testId}: ${key} must not be empty`);
    const status =
      original.Status === 'Pass'
        ? 'passed'
        : original.Status === 'Fail'
          ? 'failed'
          : null;
    if (!status)
      throw new BadRequestException(
        `${testId}: expected original Status Pass or Fail`,
      );
    // Cairo is UTC+02 on this requested date, after the 2026 DST period.
    // Check the runtime IANA rules rather than silently accepting a different offset.
    const plannedAt =
      index < 30
        ? new Date(Date.UTC(2026, 10, 5, 7, index * 5)).toISOString()
        : null;
    if (
      plannedAt &&
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Cairo',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(new Date(plannedAt)) !==
        `${String(9 + Math.floor((index * 5) / 60)).padStart(2, '0')}:${String((index * 5) % 60).padStart(2, '0')}`
    )
      throw new BadRequestException(
        'Runtime Africa/Cairo timezone rules do not match the requested plan',
      );
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
type Row = ReturnType<typeof garageRows>[number];

// Conservative content similarity flags require human review; they never merge cases.
const comparable = (value: string | null) =>
  (value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('en')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
const similarity = (a: string, b: string) => {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const left = new Set(a.split(' ')),
    right = new Set(b.split(' '));
  return (
    [...left].filter((word) => right.has(word)).length /
    new Set([...left, ...right]).size
  );
};
export function possibleGarageDuplicate(row: Row, existing: any) {
  let steps = existing.steps || '';
  try {
    const decoded = JSON.parse(steps);
    if (Array.isArray(decoded)) steps = decoded.join('\n');
  } catch {
    /* Legacy plain text steps are supported. */
  }
  const scenario = similarity(
    comparable(row.original['Test Scenario']),
    comparable(existing.scenario),
  );
  const expected = similarity(
    comparable(row.original['Expected Result']),
    comparable(existing.expectedResult),
  );
  const stepScore = similarity(
    comparable(row.original['Test Steps']),
    comparable(steps),
  );
  const samePage =
    comparable(row.original.Module) === comparable(existing.pageName);
  return (
    (scenario === 1 && (samePage || expected >= 0.8 || stepScore >= 0.8)) ||
    (samePage && scenario >= 0.8 && (expected >= 0.8 || stepScore >= 0.8)) ||
    (expected === 1 && stepScore === 1)
  );
}

@Injectable()
export class GarageImportService {
  constructor(private readonly database: DatabaseService) {}

  private admin(user: Actor) {
    if (!user?.id || user.role !== 'admin')
      throw new ForbiddenException('Administrator access required');
  }

  private matches(
    tc: any,
    metadata: any,
    row: Row,
    projectId: number,
    ownerId: number,
    batchHash: string,
  ) {
    return (
      metadata &&
      metadata.sourceKey === SOURCE &&
      metadata.batchHash === batchHash &&
      metadata.rowHash === row.rowHash &&
      hash(
        Object.fromEntries(
          GARAGE_HEADERS.map((k) => [k, metadata.original[k]]),
        ),
      ) === row.rowHash &&
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
      tc.visible_actual === row.original['Actual Result']
    );
  }

  async run(dto: GarageImportDto, user: Actor) {
    this.admin(user);
    const rows = garageRows(dto);
    const batchHash = hash(rows.map((r) => r.original));
    if (!dto.dryRun && !/^[a-f0-9]{64}$/.test(dto.previewHash || ''))
      throw new BadRequestException(
        'Commit requires the previewHash from a successful dry run',
      );
    const db = await this.database.db.connect();
    try {
      await db.query(
        dto.dryRun
          ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'
          : 'BEGIN',
      );
      await db.query(`SET LOCAL statement_timeout = '15s'`);
      await db.query(`SET LOCAL lock_timeout = '5s'`);
      const lock = dto.dryRun ? '' : ' FOR SHARE';
      const projects = (
        await db.query(
          `SELECT id,name,application FROM projects WHERE name=$1${lock}`,
          [PROJECT],
        )
      ).rows;
      if (projects.length !== 1 || projects[0].application !== APPLICATION)
        throw new ConflictException(
          'Exactly one existing Testing Garage System project with application Garage System is required',
        );
      const project = projects[0];
      const globalCollisions = await db.query(
        `SELECT tc."testId" FROM test_cases tc
        WHERE tc."projectId" IS DISTINCT FROM $1 AND tc."testId"=ANY($2::text[])
        AND EXISTS (
          SELECT 1 FROM pg_index ix JOIN pg_attribute a ON a.attrelid=ix.indrelid AND a.attnum=ix.indkey[0]
          WHERE ix.indrelid='test_cases'::regclass AND ix.indisunique AND ix.indnkeyatts=1
            AND ix.indpred IS NULL AND a.attname='testId'
        )`,
        [project.id, rows.map((row) => row.testId)],
      );
      if (globalCollisions.rowCount)
        throw new ConflictException(
          'The live schema has globally unique test IDs that conflict with another project. Review a project-scoped uniqueness migration before importing',
        );
      const users = (
        await db.query(
          `SELECT id,name,role FROM users WHERE name=ANY($1::text[])${lock}`,
          [OWNERS],
        )
      ).rows;
      const owners = OWNERS.map((name) => {
        const found = users.filter((u) => u.name === name);
        if (found.length !== 1)
          throw new ConflictException(
            `Resolve exactly one existing user named ${name}`,
          );
        return found[0];
      });
      // Owners must already have project access. Never grant access as an import side effect.
      const assignments = (
        await db.query(
          `SELECT "userId" FROM project_assignments WHERE "projectId"=$1 AND "userId"=ANY($2::int[])${lock}`,
          [project.id, owners.map((o) => o.id)],
        )
      ).rows;
      for (const owner of owners)
        if (
          owner.role !== 'admin' &&
          !assignments.some((a) => a.userId === owner.id)
        )
          throw new ConflictException(
            `${owner.name} must already be assigned to the target project`,
          );
      if (!dto.dryRun)
        await db.query('SELECT pg_advisory_xact_lock(20261105, $1)', [
          project.id,
        ]);
      const existing = (
        await db.query(
          `SELECT tc.*,to_jsonb(i) AS import_metadata,
        visible."testerId" AS visible_owner_id,visible.status AS visible_status,visible."actualResult" AS visible_actual
        FROM test_cases tc
        LEFT JOIN test_case_imports i ON i."testCaseId"=tc.id
        LEFT JOIN test_cases_current visible ON visible.id=tc.id
        WHERE (tc."projectId"=$1 AND tc."testId"=ANY($2::text[]))
          OR (i."projectId"=$1 AND i."sourceKey"=$3 AND i."sourceTestId"=ANY($2::text[]))
        ORDER BY tc.id${dto.dryRun ? '' : ' FOR UPDATE OF tc'}`,
          [project.id, rows.map((r) => r.testId), SOURCE],
        )
      ).rows;
      const conflicts: string[] = [];
      const plan = rows.map((row, index) => {
        const owner = owners[index < 30 ? 0 : 1];
        const found = existing.filter(
          (tc) =>
            tc.testId === row.testId ||
            tc.import_metadata?.sourceTestId === row.testId,
        );
        const unchanged =
          found.length === 1 &&
          this.matches(
            found[0],
            found[0].import_metadata,
            row,
            project.id,
            owner.id,
            batchHash,
          );
        if (found.length && !unchanged) conflicts.push(row.testId);
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
      const candidates = (
        await db.query(
          `SELECT id,"testId","projectId",module,"pageName",scenario,steps,"expectedResult"
         FROM test_cases WHERE "projectId"=$1 OR lower(trim(module))=lower($2)
         ORDER BY id${dto.dryRun ? '' : ' FOR UPDATE'}`,
          [project.id, APPLICATION],
        )
      ).rows;
      const semanticDuplicates = rows.flatMap((row, index) =>
        plan[index].action === 'skip'
          ? []
          : candidates
              .filter(
                (tc) =>
                  tc.id !== plan[index].databaseId &&
                  possibleGarageDuplicate(row, tc),
              )
              .map((tc) => ({
                sourceTestId: row.testId,
                databaseId: tc.id,
                existingTestId: tc.testId,
                projectId: tc.projectId,
                pageName: tc.pageName,
                reason:
                  'Similar scenario, steps or expected result; manual review required',
              })),
      );
      const previewHash = hash({
        batchHash,
        project,
        owners,
        plan,
        semanticDuplicates,
      });
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
        semanticDuplicates,
        canCommit: conflicts.length === 0 && semanticDuplicates.length === 0,
        plan,
      };
      if (dto.dryRun) {
        await db.query('ROLLBACK');
        return result;
      }
      if (conflicts.length || semanticDuplicates.length)
        throw new ConflictException({
          message: 'Existing test cases differ; nothing was overwritten',
          conflicts,
          semanticDuplicates,
        });
      if (dto.previewHash !== previewHash)
        throw new ConflictException(
          'Preview is stale. Run dry-run again and review the new mappings',
        );
      for (const [index, row] of rows.entries()) {
        if (plan[index].action === 'skip') continue;
        const o = row.original;
        const inserted = await db.query(
          `INSERT INTO test_cases
          ("testId",module,"pageName",scenario,"preConditions",steps,"expectedResult","actualResult",status,"testerId","projectId")
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
          [
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
          ],
        );
        await db.query(
          `INSERT INTO test_case_imports
          ("testCaseId","projectId","sourceKey","sourceTestId","sourceRow","rowHash","batchHash",original,"plannedAt","plannedTimezone","importedById")
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
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
          ],
        );
      }
      const verification = await this.verifyWith(db, batchHash);
      if (!verification.verified)
        throw new ConflictException(
          'Persisted data does not match the source; import rolled back',
        );
      // Existing triggers also bump the revision. Explicitly invalidate once per
      // non-empty batch so this endpoint does not rely solely on those triggers.
      const cache = (
        await db.query(
          result.wouldInsert > 0
            ? 'UPDATE app_cache_revision SET revision=revision+1 WHERE id=1 RETURNING revision::text'
            : 'SELECT revision::text FROM app_cache_revision WHERE id=1',
        )
      ).rows;
      await db.query('COMMIT');
      return {
        ...result,
        imported: result.wouldInsert,
        verified: true,
        verification,
        cacheRevision: cache[0]?.revision,
      };
    } catch (error: any) {
      await db.query('ROLLBACK');
      if (error.code === '23505')
        throw new ConflictException(
          'Concurrent duplicate detected; entire import rolled back. Preview again',
        );
      if (['55P03', '57014', '40001', '40P01'].includes(error.code))
        throw new ConflictException(
          'Import was rolled back due to concurrent activity or timeout. Preview again',
        );
      throw error;
    } finally {
      db.release();
    }
  }

  private async verifyWith(db: Pick<PoolClient, 'query'>, batchHash: string) {
    const stored = (
      await db.query(
        `SELECT tc.*,to_jsonb(i) AS import_metadata,u.name AS owner_name,
      p.name AS project_name,p.application AS project_application,
      current_tc."testerId" AS visible_owner_id,current_tc.status AS visible_status,current_tc."actualResult" AS visible_actual
      FROM test_case_imports i JOIN test_cases tc ON tc.id=i."testCaseId"
      JOIN users u ON u.id=tc."testerId" JOIN projects p ON p.id=tc."projectId"
      JOIN test_cases_current current_tc ON current_tc.id=tc.id
      WHERE i."batchHash"=$1 AND i."sourceKey"=$2 ORDER BY i."sourceRow"`,
        [batchHash, SOURCE],
      )
    ).rows;
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
        return (
          !this.matches(
            tc,
            tc.import_metadata,
            row,
            tc.projectId,
            tc.testerId,
            batchHash,
          ) ||
          tc.owner_name !== row.ownerName ||
          tc.project_name !== PROJECT ||
          tc.project_application !== APPLICATION ||
          tc.visible_owner_id !== tc.testerId ||
          tc.visible_status !== row.status ||
          tc.visible_actual !== row.original['Actual Result']
        );
      })
      .map((r) => r.testId);
    const canonicalHash = hash(source.map((r) => r.original));
    return {
      verified:
        mismatches.length === 0 &&
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

  async verify(batchHash: string, user: Actor) {
    this.admin(user);
    if (!/^[a-f0-9]{64}$/.test(batchHash))
      throw new BadRequestException('Invalid batch hash');
    return this.verifyWith(this.database.db, batchHash);
  }

  async status(user: Actor) {
    this.admin(user);
    const CanonicalBatchHash =
      '7a332076ea55ed4889b38ca5d0268af84517c5fa0702abce3a0e96cffd7f5527';
    const verification = await this.verifyWith(
      this.database.db,
      CanonicalBatchHash,
    );
    const projectRes = await this.database.db.query(
      `SELECT id, name, application FROM projects WHERE LOWER(TRIM(name)) = LOWER($1) ORDER BY id ASC LIMIT 1`,
      [PROJECT],
    );
    const project = projectRes.rows[0] || null;
    const totalInProjectRes = project
      ? await this.database.db.query(
          `SELECT COUNT(*)::int AS count FROM test_cases WHERE "projectId" = $1`,
          [project.id],
        )
      : { rows: [{ count: 0 }] };
    const wrongProjectRes = project
      ? await this.database.db.query(
          `SELECT COUNT(*)::int AS count FROM test_cases WHERE LOWER(TRIM(COALESCE(module, ''))) = LOWER($1) AND "projectId" IS DISTINCT FROM $2`,
          [APPLICATION, project.id],
        )
      : { rows: [{ count: 0 }] };
    return {
      verified: verification.verified,
      totalImported: verification.total,
      batchHash: verification.batchHash,
      project,
      assignments: verification.assignments,
      totalCasesInGarageProject: totalInProjectRes.rows[0]?.count ?? 0,
      wrongProjectGarageCasesCount: wrongProjectRes.rows[0]?.count ?? 0,
      mismatches: verification.mismatches,
    };
  }
}
