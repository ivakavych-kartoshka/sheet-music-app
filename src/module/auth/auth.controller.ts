import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { SetPasswordDto } from './dto/set-password.dto';

@Controller('auth')
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 5 login attempts per minute
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // 10 Google OAuth requests per minute
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  // 10 OAuth callbacks per minute
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: any) {
    const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:3001';

    try {
      const result = await this.authService.loginWithGoogle(req.user);

      const params = new URLSearchParams({
        access_token: result.access_token,
        name: result.user.name,
        email: result.user.email,
        avatar: result.user.avatar,
        must_set_password: result.mustSetPassword ? '1' : '0',
      });

      return res.redirect(`${clientUrl}/auth/callback?${params.toString()}`);
    } catch {
      return res.redirect(`${clientUrl}/verify-password?error=auth_failed`);
    }
  }

  // 5 password changes per minute
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('set-password')
  @UseGuards(JwtAuthGuard)
  setPassword(@Req() req: any, @Body() dto: SetPasswordDto) {
    if (req.user.role === 'admin') {
      return { success: true };
    }

    return this.authService.setPassword(req.user.userId, dto.password);
  }
}
