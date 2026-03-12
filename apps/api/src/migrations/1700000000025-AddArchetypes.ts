import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArchetypes1700000000025 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create archetypes table
    await queryRunner.query(`
      CREATE TABLE "archetypes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "purpose" text,
        "description" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_archetypes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_archetypes_name" UNIQUE ("name")
      )
    `);

    // Create join table for many-to-many with taxonomies
    await queryRunner.query(`
      CREATE TABLE "archetype_taxonomies" (
        "archetypeId" uuid NOT NULL,
        "taxonomyId" uuid NOT NULL,
        CONSTRAINT "PK_archetype_taxonomies" PRIMARY KEY ("archetypeId", "taxonomyId")
      )
    `);

    // Foreign keys with CASCADE delete on both sides
    await queryRunner.query(`
      ALTER TABLE "archetype_taxonomies"
      ADD CONSTRAINT "FK_archetype_taxonomies_archetype"
      FOREIGN KEY ("archetypeId") REFERENCES "archetypes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "archetype_taxonomies"
      ADD CONSTRAINT "FK_archetype_taxonomies_taxonomy"
      FOREIGN KEY ("taxonomyId") REFERENCES "taxonomies"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Indexes for join table
    await queryRunner.query(`
      CREATE INDEX "IDX_archetype_taxonomies_archetypeId" ON "archetype_taxonomies" ("archetypeId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_archetype_taxonomies_taxonomyId" ON "archetype_taxonomies" ("taxonomyId")
    `);

    // Full-text search vector
    await queryRunner.query(`
      ALTER TABLE "archetypes" ADD COLUMN "search_vector" tsvector
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_archetypes_search_vector" ON "archetypes" USING GIN ("search_vector")
    `);

    // Trigger function for search vector
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION archetypes_search_vector_update() RETURNS trigger AS $$
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
      CREATE TRIGGER archetypes_search_vector_trigger
      BEFORE INSERT OR UPDATE ON "archetypes"
      FOR EACH ROW EXECUTE FUNCTION archetypes_search_vector_update()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS archetypes_search_vector_trigger ON "archetypes"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS archetypes_search_vector_update()`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_archetypes_search_vector"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_archetype_taxonomies_taxonomyId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_archetype_taxonomies_archetypeId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "archetype_taxonomies"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "archetypes"`);
  }
}
