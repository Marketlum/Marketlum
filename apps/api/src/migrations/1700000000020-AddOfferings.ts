import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOfferings1700000000020 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create offering_state enum
    await queryRunner.query(`
      CREATE TYPE "offering_state_enum" AS ENUM ('draft', 'live')
    `);

    // Create offerings table
    await queryRunner.query(`
      CREATE TABLE "offerings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "purpose" text,
        "description" text,
        "link" text,
        "state" "offering_state_enum" NOT NULL DEFAULT 'draft',
        "activeFrom" TIMESTAMP,
        "activeUntil" TIMESTAMP,
        "valueStreamId" uuid,
        "agentId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_offerings" PRIMARY KEY ("id")
      )
    `);

    // Create offering_components table
    await queryRunner.query(`
      CREATE TABLE "offering_components" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "offeringId" uuid NOT NULL,
        "valueId" uuid NOT NULL,
        "quantity" decimal(12,2) NOT NULL,
        "pricingFormula" text,
        "pricingLink" text,
        CONSTRAINT "PK_offering_components" PRIMARY KEY ("id")
      )
    `);

    // Foreign keys for offerings
    await queryRunner.query(`
      ALTER TABLE "offerings"
      ADD CONSTRAINT "FK_offerings_valueStream"
      FOREIGN KEY ("valueStreamId") REFERENCES "value_streams"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "offerings"
      ADD CONSTRAINT "FK_offerings_agent"
      FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Foreign keys for offering_components
    await queryRunner.query(`
      ALTER TABLE "offering_components"
      ADD CONSTRAINT "FK_offering_components_offering"
      FOREIGN KEY ("offeringId") REFERENCES "offerings"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "offering_components"
      ADD CONSTRAINT "FK_offering_components_value"
      FOREIGN KEY ("valueId") REFERENCES "values"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Indexes for offerings
    await queryRunner.query(`
      CREATE INDEX "IDX_offerings_name" ON "offerings" ("name")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_offerings_state" ON "offerings" ("state")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_offerings_valueStreamId" ON "offerings" ("valueStreamId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_offerings_agentId" ON "offerings" ("agentId")
    `);

    // Indexes for offering_components
    await queryRunner.query(`
      CREATE INDEX "IDX_offering_components_offeringId" ON "offering_components" ("offeringId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_offering_components_valueId" ON "offering_components" ("valueId")
    `);

    // Full-text search
    await queryRunner.query(`
      ALTER TABLE "offerings" ADD COLUMN "search_vector" tsvector
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_offerings_search_vector" ON "offerings" USING GIN ("search_vector")
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION offerings_search_vector_update() RETURNS trigger AS $$
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
      CREATE TRIGGER offerings_search_vector_trigger
      BEFORE INSERT OR UPDATE ON "offerings"
      FOR EACH ROW EXECUTE FUNCTION offerings_search_vector_update()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS offerings_search_vector_trigger ON "offerings"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS offerings_search_vector_update()`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_offerings_search_vector"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_offering_components_valueId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_offering_components_offeringId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_offerings_agentId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_offerings_valueStreamId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_offerings_state"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_offerings_name"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "offering_components"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "offerings"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "offering_state_enum"`);
  }
}
