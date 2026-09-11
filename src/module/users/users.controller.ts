import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('users')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users/me
  @Get('me')
  getMe(@Req() req: any) {
    return this.usersService.findById(req.user.userId);
  }

  // GET /users/favorites
  @Get('favorites')
  getFavorites(@Req() req: any) {
    return this.usersService.getFavorites(req.user.userId);
  }

  // GET /users/favorites/ids
  @Get('favorites/ids')
  async getFavoriteIds(@Req() req: any) {
    const ids = await this.usersService.getFavoriteSongIds(req.user.userId);

    return { songIds: ids };
  }

  // GET /users/favorites/check/:songId
  @Get('favorites/check/:songId')
  async checkFavorite(@Req() req: any, @Param('songId') songId: string) {
    const isFavorite = await this.usersService.isFavorite(
      req.user.userId,
      songId,
    );

    return { isFavorite };
  }

  // POST /users/favorites/:songId
  // 20 requests/minute
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('favorites/:songId')
  async addFavorite(@Req() req: any, @Param('songId') songId: string) {
    await this.usersService.addFavorite(req.user.userId, songId);

    return { success: true };
  }

  // DELETE /users/favorites/:songId
  // 20 requests/minute
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Delete('favorites/:songId')
  async removeFavorite(@Req() req: any, @Param('songId') songId: string) {
    await this.usersService.removeFavorite(req.user.userId, songId);

    return { success: true };
  }
}
