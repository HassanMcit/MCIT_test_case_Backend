import { IsString, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'Hassan Ali',
    description: 'Updated display name',
  })
  @IsOptional()
  @IsString()
  @Matches(
    /^[\p{L}\p{N}\s\-_.,()'"/ ]{2,50}$/u,
    {
      message: 'الاسم يجب أن يتكون من 2 إلى 50 حرف مقبولة',
    },
  )
  name?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.png',
    description: 'Profile image URL or base64 data URI',
  })
  @IsOptional()
  @IsString()
  profileImage?: string;
}
