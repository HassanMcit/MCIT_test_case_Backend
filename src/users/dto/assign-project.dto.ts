import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignProjectDto {
  @ApiProperty({
    example: 1,
    description: 'ID of the project to assign to the user',
  })
  @IsInt({ message: 'معرّف المشروع يجب أن يكون رقماً صحيحاً' })
  @Min(1, { message: 'معرّف المشروع غير صالح' })
  projectId: number;
}
