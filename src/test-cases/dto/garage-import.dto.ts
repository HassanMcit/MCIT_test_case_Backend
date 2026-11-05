import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  Matches,
  ValidateNested,
} from 'class-validator';

export class GarageImportRowDto {
  @IsObject()
  original: Record<string, string | null>;
}

export class GarageImportDto {
  // Omission always previews. Strict service checks also reject implicit string coercion.
  @IsBoolean()
  @Transform(({ obj }) => obj.dryRun)
  dryRun: boolean = true;

  @IsOptional()
  @Matches(/^[a-f0-9]{64}$/)
  previewHash?: string;

  @IsArray()
  @ArrayMinSize(51)
  @ArrayMaxSize(51)
  @ValidateNested({ each: true })
  @Type(() => GarageImportRowDto)
  rows: GarageImportRowDto[];
}
