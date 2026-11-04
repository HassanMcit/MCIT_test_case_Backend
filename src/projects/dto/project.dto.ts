import {
  IsString,
  IsOptional,
  Matches,
  IsISO8601,
  IsInt,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum ProjectEnvironment {
  PRODUCTION = 'production',
  STAGING = 'staging',
}

export enum ProjectStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export class CreateProjectDto {
  @ApiProperty({ description: 'ISO 8601 timestamp with UTC offset' })
  @IsISO8601({ strict: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/)
  startAt: string;

  @ApiProperty({ description: 'ISO 8601 timestamp with UTC offset' })
  @IsISO8601({ strict: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/)
  endAt: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  assignedTesterId?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  application?: string;

  @ApiProperty({
    example: 'البوابة الرقمية المصرية',
    description: 'Project name (validated with Regex)',
  })
  @IsString()
  @Matches(/^[\p{L}\p{N}\s\-_.,()&/:'"+–—]{2,200}$/u, {
    message:
      'اسم المشروع يجب أن يتكون من 2 إلى 200 حرف ويحتوي على أحرف وأرقام مقبولة',
  })
  name: string;

  @ApiPropertyOptional({
    example: 'National digital services gateway',
    description: 'Short description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: ProjectEnvironment,
    default: ProjectEnvironment.STAGING,
    description: 'Environment (production | staging)',
  })
  @IsOptional()
  @Matches(/^(production|staging)$/, {
    message: 'البيئة يجب أن تكون إما production أو staging',
  })
  environment?: ProjectEnvironment;

  @ApiPropertyOptional({
    enum: ProjectStatus,
    default: ProjectStatus.ACTIVE,
    description: 'Status (active | archived)',
  })
  @IsOptional()
  @Matches(/^(active|archived)$/, {
    message: 'حالة المشروع يجب أن تكون إما active أو archived',
  })
  status?: ProjectStatus;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto, {
  skipNullProperties: false,
}) {
  @ValidateIf((_object, value) => value !== undefined)
  @IsISO8601({ strict: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/)
  declare startAt?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsISO8601({ strict: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/)
  declare endAt?: string;
}
