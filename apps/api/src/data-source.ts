import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { buildDataSourceOptions } from '@marketlum/core';
import { plugins } from './plugins';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default new DataSource(buildDataSourceOptions(plugins));
