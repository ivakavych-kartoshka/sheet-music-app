import { Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: any) {
    return this.usersService.findById(req.user.userId);
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  getFavorites(@Req() req: any) {
    return this.usersService.getFavorites(req.user.userId);
  }

  @Get('favorites/ids')
  @UseGuards(JwtAuthGuard)
  async getFavoriteIds(@Req() req: any) {
    const ids = await this.usersService.getFavoriteSongIds(req.user.userId);
    return { songIds: ids };
  }

  @Get('favorites/check/:songId')
  @UseGuards(JwtAuthGuard)
  async checkFavorite(@Req() req: any, @Param('songId') songId: string) {
    const isFavorite = await this.usersService.isFavorite(req.user.userId, songId);
    return { isFavorite };
  }

  @Post('favorites/:songId')
  @UseGuards(JwtAuthGuard)
  async addFavorite(@Req() req: any, @Param('songId') songId: string) {
    await this.usersService.addFavorite(req.user.userId, songId);
    return { success: true };
  }

  @Delete('favorites/:songId')
  @UseGuards(JwtAuthGuard)
  async removeFavorite(@Req() req: any, @Param('songId') songId: string) {
    await this.usersService.removeFavorite(req.user.userId, songId);
    return { success: true };
  }
}