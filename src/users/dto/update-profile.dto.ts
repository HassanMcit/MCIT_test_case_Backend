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
    example: 'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png',
    description: 'Profile photo URL or base64 data URI',
  })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiPropertyOptional({
    example: 'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png',
    description: 'Profile image URL or base64 data URI (alias for photo)',
  })
  @IsOptional()
  @IsString()
  profileImage?: string;
}
