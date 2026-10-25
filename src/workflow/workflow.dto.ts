import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export enum ReleaseStatus {
  Planning = 'planning',
  Active = 'active',
  Testing = 'testing',
  Released = 'released',
  Archived = 'archived',
}
export enum CycleStatus {
  Planning = 'planning',
  Active = 'active',
  Completed = 'completed',
  Archived = 'archived',
}
export enum ExecutionStatus {
  NotRun = 'not_run',
  Passed = 'passed',
  Failed = 'failed',
  Blocked = 'blocked',
  Skipped = 'skipped',
}
export class CreateReleaseDto {
  @IsString() @MinLength(2) @MaxLength(200) name: string;
  @IsString() @MinLength(1) @MaxLength(100) version: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @IsOptional() @IsEnum(ReleaseStatus) status?: ReleaseStatus;
  @IsOptional() @IsDateString({ strict: true }) startDate?: string | null;
  @IsOptional() @IsDateString({ strict: true }) releaseDate?: string | null;
}
export class UpdateReleaseDto extends PartialType(CreateReleaseDto) {}
export class CreateCycleDto {
  @Type(() => Number) @IsInt() @Min(1) projectId: number;
  @Type(() => Number) @IsInt() @Min(1) releaseId: number;
  @IsString() @MinLength(2) @MaxLength(200) name: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @IsOptional() @IsEnum(CycleStatus) status?: CycleStatus;
  @IsOptional() @IsDateString({ strict: true }) startDate?: string | null;
  @IsOptional() @IsDateString({ strict: true }) endDate?: string | null;
}
export class UpdateCycleDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @IsOptional() @IsEnum(CycleStatus) status?: CycleStatus;
  @IsOptional() @IsDateString({ strict: true }) startDate?: string | null;
  @IsOptional() @IsDateString({ strict: true }) endDate?: string | null;
}
export class CycleItemDto {
  @Type(() => Number) @IsInt() @Min(1) testCaseId: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) testerId?: number | null;
}
export class AddCycleItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CycleItemDto)
  items: CycleItemDto[];
}
export class AssignCycleItemDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) testerId?: number | null;
}
export class CreateExecutionDto {
  @IsEnum(ExecutionStatus) status: ExecutionStatus;
  @IsOptional() @IsString() @MaxLength(20000) actualResult?: string;
  @IsOptional() @IsString() @MaxLength(20000) notes?: string;
  @IsOptional() @IsString() @MaxLength(200) environment?: string;
  @IsOptional() @IsDateString({ strict: true }) executedAt?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(604800)
  durationSeconds?: number;
}
export class WorkflowQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) projectId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) releaseId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) cycleId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) testerId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsString() @MaxLength(30) status?: string;
}
