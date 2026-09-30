import { IsString, Matches, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiPropertyOptional({
    example: 4019,
    description: 'الرقم الوظيفي للمستخدم (User ID / Employee ID)',
  })
  @IsOptional()
  id?: number | string;

  @ApiPropertyOptional({
    example: 4019,
    description: 'الرقم الوظيفي للمستخدم (مترادف لـ id)',
  })
  @IsOptional()
  empId?: number | string;

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
    example: 'tester',
    description: 'User role: admin | tester | user (optional, defaults to tester)',
    enum: ['admin', 'tester', 'user'],
    default: 'tester',
  })
  @IsOptional()
  @IsString()
  @Matches(
    /^(admin|tester|user)$/,
    {
      message: 'الدور (role) يجب أن يكون إما admin أو tester أو user',
    },
  )
  role?: string;
}
