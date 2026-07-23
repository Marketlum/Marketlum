import { Command, CommandRunner } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';

@Command({
  name: 'seed:admin',
  description: 'Seed the admin user (admin@marketlum.com / password123)',
})
export class SeedAdminCommand extends CommandRunner {
  private readonly logger = new Logger(SeedAdminCommand.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {
    super();
  }

  async run(): Promise<void> {
    let user;
    try {
      user = await this.usersService.create({
        email: 'admin@marketlum.com',
        password: 'password123',
        name: 'Admin',
      });
      this.logger.log('Admin user created: admin@marketlum.com / password123');
    } catch (error: any) {
      if (error?.status === 409) {
        this.logger.log('Admin user already exists.');
        user = await this.usersService.findByEmail('admin@marketlum.com');
      } else {
        throw error;
      }
    }

    if (user) {
      const adminRole = await this.rolesService.ensureAdminRole();
      const withRoles = await this.usersService.findOneWithRoles(user.id);
      if (!(withRoles.roles ?? []).some((r) => r.id === adminRole.id)) {
        await this.usersService.assignRoles(user.id, [
          ...(withRoles.roles ?? []).map((r) => r.id),
          adminRole.id,
        ]);
        this.logger.log('Admin role assigned.');
      }
    }
  }
}
