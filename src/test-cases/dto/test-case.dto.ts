import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum Priority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum Status {
  PASSED = 'passed',
  FAILED = 'failed',
  PENDING = 'pending',
}

export class CreateTestCaseDto {
  @ApiPropertyOptional({
    example: 'TC-8492',
    description: 'Custom test ID matching TC-XXXX (validated with Regex)',
  })
  @IsOptional()
  @IsString()
  @Matches(
    /^TC-\d{4,}$/,
    {
      message: 'يجب أن يطابق معرّف الاختبار النمط TC-XXXX (مثل TC-8492)',
    },
  )
  testId?: string;

  @ApiProperty({
    example: 'Authentication',
    description: 'System module being tested (validated with Regex)',
  })
  @IsString()
  @Matches(
    /^[\p{L}\p{N}\s\-_.,()&/]{2,50}$/u,
    {
      message: 'اسم الوحدة البرمجية يجب أن يتكون من 2 إلى 50 حرف مقبولة',
    },
  )
  module: string;

  @ApiPropertyOptional({
    example: 'Login Page',
    description: 'Specific page or screen name',
  })
  @IsOptional()
  @IsString()
  pageName?: string;

  @ApiProperty({
    example: 'Validate SSO token via SMS 2FA',
    description: 'Test scenario description',
  })
  @IsString()
  @MinLength(5, { message: 'سيناريو الاختبار يجب ألا يقل عن 5 أحرف' })
  scenario: string;

  @ApiPropertyOptional({ example: 'User must be registered with admin role' })
  @IsOptional()
  @IsString()
  preConditions?: string;

  @ApiProperty({
    example: ['Navigate to login', 'Enter credentials', 'Click submit'],
    description: 'Array of test steps',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  steps: string[];

  @ApiProperty({ example: 'User is redirected to dashboard' })
  @IsString()
  expectedResult: string;

  @ApiPropertyOptional({ example: 'User was redirected successfully' })
  @IsOptional()
  @IsString()
  actualResult?: string;

  @ApiPropertyOptional({
    enum: Priority,
    default: Priority.MEDIUM,
    description: 'Priority level (critical | high | medium | low)',
  })
  @IsOptional()
  @Matches(
    /^(critical|high|medium|low)$/,
    {
      message: 'الأولوية يجب أن تكون إما: critical أو high أو medium أو low',
    },
  )
  priority?: Priority;

  @ApiPropertyOptional({
    enum: Status,
    default: Status.PENDING,
    description: 'Execution status (passed | failed | pending)',
  })
  @IsOptional()
  @Matches(
    /^(passed|failed|pending)$/,
    {
      message: 'الحالة يجب أن تكون إما: passed أو failed أو pending',
    },
  )
  status?: Status;

  @ApiPropertyOptional({ example: 'Intermittent on mobile' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: '2026-09-27T14:20:00.000Z',
    description: 'Execution timestamp in ISO 8601 format',
  })
  @IsOptional()
  @Matches(
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/,
    {
      message: 'تاريخ التنفيذ يجب أن يطابق صيغة ISO 8601 (مثل YYYY-MM-DD أو YYYY-MM-DDTHH:mm:ss.sssZ)',
    },
  )
  executedAt?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID of the tester (User)' })
  @IsOptional()
  @IsInt({ message: 'معرّف الفاحص يجب أن يكون رقماً صحيحاً' })
  testerId?: number;

  @ApiPropertyOptional({ example: 1, description: 'User ID of the tester (مترادف لـ testerId)' })
  @IsOptional()
  @IsInt({ message: 'معرّف المستخدم (userId) يجب أن يكون رقماً صحيحاً' })
  userId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID of the project this test case belongs to' })
  @IsOptional()
  @IsInt({ message: 'معرّف المشروع يجب أن يكون رقماً صحيحاً' })
  projectId?: number;
}

export class UpdateTestCaseDto extends PartialType(CreateTestCaseDto) {}
