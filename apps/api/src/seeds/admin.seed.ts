import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Agent } from '../agents/entities/agent.entity';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'marketlum',
    password: process.env.DATABASE_PASSWORD || 'marketlum',
    database: process.env.DATABASE_NAME || 'marketlum',
    entities: [User, Agent],
    synchronize: false,
  });

  await dataSource.initialize();

  const userRepo = dataSource.getRepository(User);

  const existing = await userRepo.findOne({ where: { email: 'admin@marketlum.com' } });
  if (!existing) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    await userRepo.save(
      userRepo.create({
        email: 'admin@marketlum.com',
        password: hashedPassword,
        name: 'Admin',
      }),
    );
    console.log('Admin user created: admin@marketlum.com / password123');
  } else {
    console.log('Admin user already exists');
  }

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
