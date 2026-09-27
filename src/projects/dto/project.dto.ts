import { IsString, IsOptional, Matches } from 'class-validator';
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
  @ApiProperty({
    example: 'البوابة الرقمية المصرية',
    description: 'Project name (validated with Regex)',
  })
  @IsString()
  @Matches(
    /^[\p{L}\p{N}\s\-_.,()&/]{2,100}$/u,
    {
      message: 'اسم المشروع يجب أن يتكون من 2 إلى 100 حرف ويحتوي على أحرف وأرقام مقبولة',
    },
  )
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
  @Matches(
    /^(production|staging)$/,
    {
      message: 'البيئة يجب أن تكون إما production أو staging',
    },
  )
  environment?: ProjectEnvironment;

  @ApiPropertyOptional({
    enum: ProjectStatus,
    default: ProjectStatus.ACTIVE,
    description: 'Status (active | archived)',
  })
  @IsOptional()
  @Matches(
    /^(active|archived)$/,
    {
      message: 'حالة المشروع يجب أن تكون إما active أو archived',
    },
  )
  status?: ProjectStatus;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
