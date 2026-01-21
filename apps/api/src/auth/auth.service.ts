import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { PasswordResetToken } from '../users/entities/password-reset-token.entity';
import { UsersService } from '../users/users.service';
import { EmailService } from './email.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    isActive: boolean;
    agentId: string;
    defaultLocaleId: string;
    avatarFileId: string | null;
  };
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User account is inactive.');
    }

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        isActive: user.isActive,
        agentId: user.agentId,
        defaultLocaleId: user.defaultLocaleId,
        avatarFileId: user.avatarFileId,
      },
      accessToken,
    };
  }

  async getMe(userId: string): Promise<User> {
    return this.usersService.findOne(userId);
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ ok: true }> {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);

    // Always return success to prevent email enumeration
    if (!user) {
      return { ok: true };
    }

    // Invalidate existing tokens for this user
    await this.passwordResetTokenRepository.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    // Generate a random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Token expires in 60 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 60);

    // Save the token
    const passwordResetToken = this.passwordResetTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });
    await this.passwordResetTokenRepository.save(passwordResetToken);

    // Send email with the raw token
    await this.emailService.sendPasswordResetEmail(user.email, rawToken);

    return { ok: true };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ ok: true }> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(resetPasswordDto.token)
      .digest('hex');

    const passwordResetToken = await this.passwordResetTokenRepository.findOne({
      where: {
        tokenHash,
        usedAt: IsNull(),
      },
      relations: ['user'],
    });

    if (!passwordResetToken) {
      throw new BadRequestException('Reset token is invalid or expired.');
    }

    if (new Date() > passwordResetToken.expiresAt) {
      throw new BadRequestException('Reset token is invalid or expired.');
    }

    // Update the user's password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(resetPasswordDto.newPassword, saltRounds);
    await this.userRepository.update(passwordResetToken.userId, {
      passwordHash: newPasswordHash,
    });

    // Mark the token as used
    passwordResetToken.usedAt = new Date();
    await this.passwordResetTokenRepository.save(passwordResetToken);

    return { ok: true };
  }

  async validateToken(token: string): Promise<User | null> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findOne(payload.sub);
      if (!user.isActive) {
        return null;
      }
      return user;
    } catch {
      return null;
    }
  }
}
