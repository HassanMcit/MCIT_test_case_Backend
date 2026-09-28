import { Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
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
}
