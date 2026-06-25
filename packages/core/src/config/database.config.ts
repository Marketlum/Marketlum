import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { buildDataSourceOptions } from './build-data-source-options';
import { MarketlumApiPlugin } from '../plugins/marketlum-api-plugin';

export const databaseConfig = (
  plugins: MarketlumApiPlugin[] = [],
): TypeOrmModuleOptions => buildDataSourceOptions(plugins) as TypeOrmModuleOptions;
