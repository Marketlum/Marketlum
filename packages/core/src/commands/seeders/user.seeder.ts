import { faker } from '@faker-js/faker';
import { UsersService } from '../../users/users.service';

const USERS = [
  { name: 'John Doe', email: 'admin@marketlum.com' },
  { name: 'Bob Smith', email: 'bob@marketlum.com' },
  { name: 'Carol Martinez', email: 'carol@marketlum.com' },
  { name: 'David Chen', email: 'david@marketlum.com' },
  { name: 'Eva Kowalski', email: 'eva@marketlum.com' },
];

export async function seedUsers(service: UsersService) {
  const users: Array<{ id: string; name: string; email: string }> = [];

  for (const userData of USERS) {
    const user = await service.create({
      name: userData.name,
      email: userData.email,
      password: 'password123',
    });
    users.push({ id: user.id, name: user.name, email: user.email });
  }

  return users;
}
