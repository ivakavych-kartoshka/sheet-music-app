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
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  SongsService,
  type UploadedAudioFile,
  type UploadedSheetFile,
} from './songs.service';
import { CreateSongDto } from './dto/create-song.dto';
import { NormalizeSongDto } from './dto/normalize-song.dto';
import { AdminGuard } from '../auth/admin.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('songs')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  // GET /songs
  // 60 requests/minute
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe)
    page = 1,
    @Query('limit', new DefaultValuePipe(9), ParseIntPipe)
    limit = 9,
  ) {
    return this.songsService.findAll(search, category, page, limit);
  }

  // GET /songs/categories
  @Get('categories')
  findCategories() {
    return this.songsService.findCategories();
  }

  // GET /songs/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.songsService.findOne(id);
  }

  // GET /songs/slug/:slug
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.songsService.findBySlug(slug);
  }

  // POST /songs
  // 10 requests/minute
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  @UseGuards(AdminGuard)
  create(@Body() createSongDto: CreateSongDto) {
    return this.songsService.create(createSongDto);
  }

  // POST /songs/normalize
  // 10 requests/minute
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('normalize')
  @UseGuards(AdminGuard)
  normalize(@Body() normalizeSongDto: NormalizeSongDto) {
    return this.songsService.normalize(normalizeSongDto);
  }

  // PUT /songs/:id
  // 10 requests/minute
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Put(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() updateSongDto: CreateSongDto) {
    return this.songsService.update(id, updateSongDto);
  }

  // DELETE /songs/:id
  // 10 requests/minute
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.songsService.remove(id);
  }

  // POST /songs/upload-audio
  // 5 requests/minute
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('upload-audio')
  @UseGuards(AdminGuard)
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

  // POST /songs/upload-sheet
  // 5 requests/minute
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('upload-sheet')
  @UseGuards(AdminGuard)
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

  // POST /songs/upload-sheets
  // 2 requests/minute
  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  @Post('upload-sheets')
  @UseGuards(AdminGuard)
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
