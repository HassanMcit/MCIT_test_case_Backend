import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'password123',
    description: 'كلمة المرور الحالية',
  })
  @IsString({ message: 'كلمة المرور الحالية يجب أن تكون نصاً' })
  @MinLength(6, {
    message: 'كلمة المرور الحالية يجب أن تكون 6 أحرف على الأقل',
  })
  @MaxLength(50, {
    message: 'كلمة المرور الحالية لا يمكن أن تتجاوز 50 حرفاً',
  })
  oldPassword: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'كلمة المرور الجديدة',
  })
  @IsString({ message: 'كلمة المرور الجديدة يجب أن تكون نصاً' })
  @MinLength(6, {
    message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل',
  })
  @MaxLength(50, {
    message: 'كلمة المرور الجديدة لا يمكن أن تتجاوز 50 حرفاً',
  })
  newPassword: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'تأكيد كلمة المرور الجديدة',
  })
  @IsString({ message: 'تأكيد كلمة المرور يجب أن يكون نصاً' })
  @MinLength(6, {
    message: 'تأكيد كلمة المرور يجب أن يكون 6 أحرف على الأقل',
  })
  @MaxLength(50, {
    message: 'تأكيد كلمة المرور لا يمكن أن يتجاوز 50 حرفاً',
  })
  confirmPassword: string;
}
