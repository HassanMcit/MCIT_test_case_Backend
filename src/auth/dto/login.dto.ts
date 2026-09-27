import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'karim@mcit.gov.eg',
    description: 'User email address (validated with Regex)',
  })
  @Matches(
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    {
      message: 'البريد الإلكتروني غير صالح. يجب أن يطابق الصيغة user@domain.com',
    },
  )
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password (min 6 characters, validated with Regex)',
  })
  @IsString()
  @Matches(
    /^.{6,50}$/,
    {
      message: 'كلمة المرور يجب أن تكون بين 6 إلى 50 حرفاً',
    },
  )
  password: string;
}
