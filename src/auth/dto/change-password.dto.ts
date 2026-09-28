import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'password123',
    description: 'كلمة المرور الحالية',
  })
  @IsString()
  @Matches(/^.{6,50}$/, {
    message: 'كلمة المرور الحالية يجب أن تكون بين 6 إلى 50 حرفاً',
  })
  oldPassword: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'كلمة المرور الجديدة',
  })
  @IsString()
  @Matches(/^.{6,50}$/, {
    message: 'كلمة المرور الجديدة يجب أن تكون بين 6 إلى 50 حرفاً',
  })
  newPassword: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'تأكيد كلمة المرور الجديدة',
  })
  @IsString()
  @Matches(/^.{6,50}$/, {
    message: 'تأكيد كلمة المرور يجب أن يكون بين 6 إلى 50 حرفاً',
  })
  confirmPassword: string;
}
