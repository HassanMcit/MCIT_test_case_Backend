import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'h.ali@mcit.gov.eg',
    description: 'البريد الإلكتروني لحساب المستخدم أو المدير',
  })
  @Matches(
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    {
      message: 'البريد الإلكتروني غير صالح. يجب أن يطابق الصيغة user@domain.com',
    },
  )
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'كود التحقق المكون من 6 أرقام المرسل للبريد',
  })
  @Matches(/^[0-9]{6}$/, {
    message: 'كود التحقق يجب أن يتكون من 6 أرقام',
  })
  code: string;

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
