import {
  Controller,
  Post,
  Get,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: { user: User }, @Res({ passthrough: true }) res: Response) {
    const token = this.authService.generateToken(req.user);

    const cookieDomain = process.env.COOKIE_DOMAIN;

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: !!cookieDomain,
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      ...(cookieDomain && { domain: cookieDomain }),
    });

    return this.usersService.stripPassword(req.user);
  }

  @UseGuards(AdminGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Res({ passthrough: true }) res: Response) {
    const cookieDomain = process.env.COOKIE_DOMAIN;

    res.clearCookie('token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: !!cookieDomain,
      path: '/',
      ...(cookieDomain && { domain: cookieDomain }),
    });
  }

  @UseGuards(AdminGuard)
  @Get('me')
  async me(@CurrentUser() user: User) {
    return this.usersService.stripPassword(user);
  }
}
