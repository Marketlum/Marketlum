import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveRecurringFlows1700000000053 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "recurring_flow_taxonomies"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recurring_flows"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "recurring_flow_direction_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "recurring_flow_frequency_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "recurring_flow_status_enum"`);
  }

  public async down(): Promise<void> {
    throw new Error(
      'Recurring flows were removed; restore from migration 1700000000038-AddRecurringFlows if ever needed.',
    );
  }
}
