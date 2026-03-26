import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFullTextSearch1700000000012 implements MigrationInterface {
  name = 'AddFullTextSearch1700000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add search_vector columns
    await queryRunner.query(
      `ALTER TABLE "values" ADD COLUMN "search_vector" tsvector`,
    );
    await queryRunner.query(
      `ALTER TABLE "agents" ADD COLUMN "search_vector" tsvector`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "search_vector" tsvector`,
    );

    // Create GIN indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_values_search_vector" ON "values" USING GIN ("search_vector")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_agents_search_vector" ON "agents" USING GIN ("search_vector")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_search_vector" ON "users" USING GIN ("search_vector")`,
    );

    // Trigger function for values: name(A) + purpose(B) + description(C)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION values_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.purpose, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Trigger function for agents: name(A) + purpose(B)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION agents_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.purpose, '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Trigger function for users: name(A) + email(B)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION users_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create triggers
    await queryRunner.query(`
      CREATE TRIGGER values_search_vector_trigger
        BEFORE INSERT OR UPDATE ON "values"
        FOR EACH ROW EXECUTE FUNCTION values_search_vector_update();
    `);
    await queryRunner.query(`
      CREATE TRIGGER agents_search_vector_trigger
        BEFORE INSERT OR UPDATE ON "agents"
        FOR EACH ROW EXECUTE FUNCTION agents_search_vector_update();
    `);
    await queryRunner.query(`
      CREATE TRIGGER users_search_vector_trigger
        BEFORE INSERT OR UPDATE ON "users"
        FOR EACH ROW EXECUTE FUNCTION users_search_vector_update();
    `);

    // Backfill existing rows
    await queryRunner.query(`
      UPDATE "values" SET search_vector =
        setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(purpose, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(description, '')), 'C');
    `);
    await queryRunner.query(`
      UPDATE "agents" SET search_vector =
        setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(purpose, '')), 'B');
    `);
    await queryRunner.query(`
      UPDATE "users" SET search_vector =
        setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(email, '')), 'B');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS values_search_vector_trigger ON "values"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS agents_search_vector_trigger ON "agents"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS users_search_vector_trigger ON "users"`,
    );

    // Drop trigger functions
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS values_search_vector_update()`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS agents_search_vector_update()`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS users_search_vector_update()`,
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_values_search_vector"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agents_search_vector"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_search_vector"`);

    // Drop columns
    await queryRunner.query(
      `ALTER TABLE "values" DROP COLUMN "search_vector"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agents" DROP COLUMN "search_vector"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "search_vector"`,
    );
  }
}
