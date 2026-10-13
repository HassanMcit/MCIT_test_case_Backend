import { IsString, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

export class ChangePasswordDto {
  @ApiProperty({
    example: 'Mm$$1020',
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
    example: 'NewPass@2026',
    description: 'كلمة المرور الجديدة',
  })
  @IsString({ message: 'كلمة المرور الجديدة يجب أن تكون نصاً' })
  @Matches(PASSWORD_REGEX, {
    message:
      'يجب أن تتكون كلمة المرور من 8 خانات على الأقل، وتحتوي على حرف كبير، وحرف صغير، ورقم، ورمز خاص.',
  })
  newPassword: string;

  @ApiProperty({
    example: 'NewPass@2026',
    description: 'تأكيد كلمة المرور الجديدة',
  })
  @IsString({ message: 'تأكيد كلمة المرور يجب أن يكون نصاً' })
  @Matches(PASSWORD_REGEX, {
    message:
      'يجب أن تتكون كلمة المرور من 8 خانات على الأقل، وتحتوي على حرف كبير، وحرف صغير، ورقم، ورمز خاص.',
  })
  confirmPassword: string;
}
