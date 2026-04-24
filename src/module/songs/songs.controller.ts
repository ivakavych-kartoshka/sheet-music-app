import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  SongsService,
  type UploadedAudioFile,
  type UploadedSheetFile,
} from './songs.service';
import { CreateSongDto } from './dto/create-song.dto';
import { NormalizeSongDto } from './dto/normalize-song.dto';

@Controller('songs')
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(9), ParseIntPipe) limit = 9,
  ) {
    return this.songsService.findAll(search, category, page, limit);
  }

  @Get('categories')
  findCategories() {
    return this.songsService.findCategories();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.songsService.findOne(id);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.songsService.findBySlug(slug);
  }

  @Post()
  create(@Body() createSongDto: CreateSongDto) {
    return this.songsService.create(createSongDto);
  }

  @Post('normalize')
  normalize(@Body() normalizeSongDto: NormalizeSongDto) {
    return this.songsService.normalize(normalizeSongDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateSongDto: CreateSongDto) {
    return this.songsService.update(id, updateSongDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.songsService.remove(id);
  }

  @Post('upload-audio')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 20 * 1024 * 1024,
      },
    }),
  )
  uploadAudio(@UploadedFile() file: UploadedAudioFile) {
    return this.songsService.uploadAudio(file);
  }

  @Post('upload-sheet')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 15 * 1024 * 1024,
      },
    }),
  )
  uploadSheet(@UploadedFile() file: UploadedSheetFile) {
    return this.songsService.uploadSheet(file);
  }

  @Post('upload-sheets')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      limits: {
        fileSize: 15 * 1024 * 1024,
      },
    }),
  )
  uploadSheets(@UploadedFiles() files: UploadedSheetFile[]) {
    return this.songsService.uploadSheets(files);
  }
}
