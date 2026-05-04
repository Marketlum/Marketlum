import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createUserSchema,
  updateUserSchema,
  changeUserPasswordSchema,
  paginationQuerySchema,
  CreateUserInput,
  UpdateUserInput,
  ChangeUserPasswordInput,
  PaginationQuery,
} from '@marketlum/shared';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(AdminGuard)
  async create(
    @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput,
  ) {
    const user = await this.usersService.create(body);
    return this.usersService.stripPassword(user);
  }

  @Get()
  @UseGuards(AdminGuard)
  async findAll(@Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return this.usersService.stripPassword(user);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserInput,
  ) {
    const user = await this.usersService.update(id, body);
    return this.usersService.stripPassword(user);
  }

  @Post(':id/change-password')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(changeUserPasswordSchema)) body: ChangeUserPasswordInput,
  ) {
    const user = await this.usersService.changePassword(id, body.password);
    return this.usersService.stripPassword(user);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
  }
}
