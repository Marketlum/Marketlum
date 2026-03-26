import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTensions1700000000035 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tensions table
    await queryRunner.query(`
      CREATE TABLE "tensions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "currentContext" text,
        "potentialFuture" text,
        "score" integer NOT NULL DEFAULT 5,
        "agentId" uuid NOT NULL,
        "leadUserId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tensions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tensions_agent" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tensions_lead" FOREIGN KEY ("leadUserId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Add tensionId to exchanges
    await queryRunner.query(`
      ALTER TABLE "exchanges" ADD COLUMN "tensionId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "exchanges"
        ADD CONSTRAINT "FK_exchanges_tension"
        FOREIGN KEY ("tensionId") REFERENCES "tensions"("id") ON DELETE SET NULL
    `);

    // Add search_vector column
    await queryRunner.query(`
      ALTER TABLE "tensions" ADD COLUMN "search_vector" tsvector
    `);

    // Create GIN index
    await queryRunner.query(`
      CREATE INDEX "IDX_tensions_search_vector" ON "tensions" USING GIN ("search_vector")
    `);

    // Create trigger function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION tensions_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW."currentContext", '')), 'B') ||
          setweight(to_tsvector('english', coalesce(NEW."potentialFuture", '')), 'C');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // Attach trigger
    await queryRunner.query(`
      CREATE TRIGGER tensions_search_vector_trigger
      BEFORE INSERT OR UPDATE ON "tensions"
      FOR EACH ROW EXECUTE FUNCTION tensions_search_vector_update()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS tensions_search_vector_trigger ON "tensions"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS tensions_search_vector_update()`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tensions_search_vector"`);
    await queryRunner.query(`ALTER TABLE "exchanges" DROP CONSTRAINT IF EXISTS "FK_exchanges_tension"`);
    await queryRunner.query(`ALTER TABLE "exchanges" DROP COLUMN IF EXISTS "tensionId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tensions"`);
  }
}
