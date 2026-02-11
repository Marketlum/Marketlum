import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddValueInstancesSearch1700000000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "value_instances" ADD COLUMN "search_vector" tsvector
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_value_instances_search_vector" ON "value_instances" USING GIN ("search_vector")
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION value_instances_search_trigger() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.purpose, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER value_instances_search_update
      BEFORE INSERT OR UPDATE ON "value_instances"
      FOR EACH ROW EXECUTE FUNCTION value_instances_search_trigger()
    `);

    await queryRunner.query(`
      UPDATE "value_instances" SET "name" = "name"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS value_instances_search_update ON "value_instances"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS value_instances_search_trigger`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_value_instances_search_vector"`);
    await queryRunner.query(`ALTER TABLE "value_instances" DROP COLUMN IF EXISTS "search_vector"`);
  }
}
