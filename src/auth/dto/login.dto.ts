import { IsString, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({ description: 'Client IP address' })
  @IsOptional()
  @IsString()
  clientIp?: string;

  @ApiPropertyOptional({ description: 'Device MAC / Hardware ID' })
  @IsOptional()
  @IsString()
  macAddress?: string;

  @ApiPropertyOptional({ description: 'Device OS & Browser info' })
  @IsOptional()
  @IsString()
  deviceInfo?: string;

  @ApiPropertyOptional({ description: 'Geographic location of the login' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Browser User-Agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;
}
