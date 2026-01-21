import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService, UserPaginatedResponse } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { User } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Post('seed')
  seed(): Promise<{ inserted: number; skipped: number }> {
    return this.usersService.seed();
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('q') q?: string,
    @Query('isActive') isActive?: string,
    @Query('agentId') agentId?: string,
    @Query('localeId') localeId?: string,
    @Query('sort') sort?: string,
  ): Promise<UserPaginatedResponse> {
    return this.usersService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      q,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      agentId,
      localeId,
      sort,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  @Post(':id/set-password')
  @HttpCode(HttpStatus.OK)
  async setPassword(
    @Param('id') id: string,
    @Body() setPasswordDto: SetPasswordDto,
  ): Promise<{ ok: true }> {
    await this.usersService.setPassword(id, setPasswordDto);
    return { ok: true };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.usersService.remove(id);
  }
}
