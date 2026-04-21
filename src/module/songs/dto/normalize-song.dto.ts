import { IsOptional, IsString } from 'class-validator';

export class NormalizeSongDto {
  @IsString()
  rawText?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  audioUrl?: string;
}
