import { Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsAllowedAccountEmail } from '../account-email-policy';

export class VerifyResetCodeDto {
  @ApiProperty({
    example: 'h.ali@mcit.gov.eg',
    description: 'البريد الإلكتروني المسجل',
  })
  @IsAllowedAccountEmail()
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
