import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddValueStreams1700000000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create value_streams table
    await queryRunner.query(`
      CREATE TABLE "value_streams" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "purpose" text,
        "level" integer NOT NULL DEFAULT 0,
        "leadUserId" uuid,
        "imageId" uuid,
        "parentId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_value_streams" PRIMARY KEY ("id")
      )
    `);

    // Create closure table
    await queryRunner.query(`
      CREATE TABLE "value_streams_closure" (
        "id_ancestor" uuid NOT NULL,
        "id_descendant" uuid NOT NULL,
        "level" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_value_streams_closure" PRIMARY KEY ("id_ancestor", "id_descendant")
      )
    `);

    // Foreign keys
    await queryRunner.query(`
      ALTER TABLE "value_streams"
      ADD CONSTRAINT "FK_value_streams_parent"
      FOREIGN KEY ("parentId") REFERENCES "value_streams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "value_streams"
      ADD CONSTRAINT "FK_value_streams_lead"
      FOREIGN KEY ("leadUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "value_streams"
      ADD CONSTRAINT "FK_value_streams_image"
      FOREIGN KEY ("imageId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "value_streams_closure"
      ADD CONSTRAINT "FK_value_streams_closure_ancestor"
      FOREIGN KEY ("id_ancestor") REFERENCES "value_streams"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "value_streams_closure"
      ADD CONSTRAINT "FK_value_streams_closure_descendant"
      FOREIGN KEY ("id_descendant") REFERENCES "value_streams"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Indexes on closure table
    await queryRunner.query(`
      CREATE INDEX "IDX_value_streams_closure_ancestor" ON "value_streams_closure" ("id_ancestor")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_value_streams_closure_descendant" ON "value_streams_closure" ("id_descendant")
    `);

    // Full-text search
    await queryRunner.query(`
      ALTER TABLE "value_streams" ADD COLUMN "search_vector" tsvector
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_value_streams_search_vector" ON "value_streams" USING GIN ("search_vector")
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION value_streams_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.purpose, '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER value_streams_search_vector_trigger
      BEFORE INSERT OR UPDATE ON "value_streams"
      FOR EACH ROW EXECUTE FUNCTION value_streams_search_vector_update()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS value_streams_search_vector_trigger ON "value_streams"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS value_streams_search_vector_update()`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_value_streams_search_vector"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_value_streams_closure_descendant"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_value_streams_closure_ancestor"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "value_streams_closure"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "value_streams"`);
  }
}
