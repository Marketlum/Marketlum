import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService, AuthResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User } from '../users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(): Promise<{ ok: true }> {
    // For JWT, logout is typically handled client-side by removing the token
    // If using refresh tokens, we would invalidate them here
    return Promise.resolve({ ok: true });
  }

  @Get('me')
  async getMe(@Headers('authorization') authHeader: string): Promise<User> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided.');
    }

    const token = authHeader.substring(7);
    const user = await this.authService.validateToken(token);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    return user;
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ ok: true }> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ ok: true }> {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
