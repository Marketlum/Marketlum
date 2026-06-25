import { MigrationInterface, QueryRunner } from 'typeorm';

/** Creates the example plugin's table. Runs after core migrations (later
 * timestamp), demonstrating plugin-owned migration aggregation. */
export class CreateExampleWidgets1700000000900 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "plugin_example_widgets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "code" varchar,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_plugin_example_widgets" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "plugin_example_widgets"`);
  }
}
