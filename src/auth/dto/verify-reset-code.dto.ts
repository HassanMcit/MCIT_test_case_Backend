import { Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyResetCodeDto {
  @ApiProperty({
    example: 'h.ali@mcit.gov.eg',
    description: 'البريد الإلكتروني المسجل',
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
    description: 'كود التحقق المكون من 6 أرقام',
  })
  @Matches(/^[0-9]{6}$/, {
    message: 'كود التحقق يجب أن يتكون من 6 أرقام',
  })
  code: string;
}
