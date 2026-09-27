import { IsString, Matches, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'محمود أحمد النجار',
    description: 'Full name of the user',
  })
  @IsString()
  @Matches(
    /^[\p{L}\p{N}\s\-_.,()'"/]{2,50}$/u,
    {
      message: 'الاسم يجب أن يتكون من 2 إلى 50 حرف مقبولة',
    },
  )
  name: string;

  @ApiProperty({
    example: 'mahmoud@mcit.gov.eg',
    description: 'Unique email address',
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
    description: 'Password (between 6 and 50 characters)',
  })
  @IsString()
  @Matches(
    /^.{6,50}$/,
    {
      message: 'كلمة المرور يجب أن تكون بين 6 إلى 50 حرفاً',
    },
  )
  password: string;

  @ApiPropertyOptional({
    example: 'user',
    description: 'User role: admin | user (optional, defaults to user)',
    enum: ['admin', 'user'],
    default: 'user',
  })
  @IsOptional()
  @IsString()
  @Matches(
    /^(admin|user)$/,
    {
      message: 'الدور (role) يجب أن يكون إما admin أو user فقط',
    },
  )
  role?: string;
}
