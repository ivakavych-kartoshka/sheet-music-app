import {
  IsString,
  IsArray,
  IsOptional,
  ValidateNested,
  IsNotEmpty,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class LineDto {
  @IsString({ message: 'Lyric must be a string' })
  @IsNotEmpty({ message: 'Lyric is required' })
  lyric?: string;

  @IsString({ message: 'Notes must be a string' })
  @IsNotEmpty({ message: 'Notes is required' })
  notes?: string;
}

class SectionDto {
  @IsString({ message: 'Section title must be a string' })
  @IsNotEmpty({ message: 'Section title is required' })
  title?: string;

  @IsArray({ message: 'Lines must be an array' })
  @ArrayMinSize(1, { message: 'Lines must have at least 1 item' })
  @ValidateNested({ each: true })
  @Type(() => LineDto)
  lines?: LineDto[];
}

export class CreateSongDto {
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  title?: string;

  @IsString({ message: 'Category must be a string' })
  @IsNotEmpty({ message: 'Category is required' })
  category?: string;

  @IsOptional()
  @IsArray({ message: 'Sections must be an array' })
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections?: SectionDto[];

  @IsOptional()
  @IsString({ message: 'Audio URL must be a string' })
  audioUrl?: string;

  @IsOptional()
  @IsString({ message: 'Sheet URL must be a string' })
  sheetUrl?: string;

  @IsOptional()
  @IsArray({ message: 'Sheet URLs must be an array' })
  @Type(() => Array)
  sheetUrls?: string[];

  @IsOptional()
  @IsArray({ message: 'Images must be an array' })
  @Type(() => Array)
  images?: string[];
}
