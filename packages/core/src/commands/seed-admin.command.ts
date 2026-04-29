import { Command, CommandRunner } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Command({
  name: 'seed:admin',
  description: 'Seed the admin user (admin@marketlum.com / password123)',
})
export class SeedAdminCommand extends CommandRunner {
  private readonly logger = new Logger(SeedAdminCommand.name);

  constructor(private readonly usersService: UsersService) {
    super();
  }

  async run(): Promise<void> {
    try {
      await this.usersService.create({
        email: 'admin@marketlum.com',
        password: 'password123',
        name: 'Admin',
      });
      this.logger.log('Admin user created: admin@marketlum.com / password123');
    } catch (error: any) {
      if (error?.status === 409) {
        this.logger.log('Admin user already exists.');
      } else {
        throw error;
      }
    }
  }
}
