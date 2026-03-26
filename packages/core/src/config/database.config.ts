import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ALL_ENTITIES } from '../entities';
import { ALL_MIGRATIONS } from '../migrations';

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME || 'marketlum',
  password: process.env.DATABASE_PASSWORD || 'marketlum',
  database: process.env.DATABASE_NAME || 'marketlum',
  entities: ALL_ENTITIES,
  migrations: ALL_MIGRATIONS,
  synchronize: false,
});
