import { ApiProperty } from '@nestjs/swagger';
import { IsAllowedAccountEmail } from '../account-email-policy';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'h.ali@mcit.gov.eg',
    description: 'البريد الإلكتروني لحساب المستخدم أو المدير',
  })
  @IsAllowedAccountEmail()
  email: string;
}
