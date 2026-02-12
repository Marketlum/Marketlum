import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChannels1700000000019 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create channels table
    await queryRunner.query(`
      CREATE TABLE "channels" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "purpose" text,
        "color" character varying NOT NULL,
        "level" integer NOT NULL DEFAULT 0,
        "parentId" uuid,
        "agentId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_channels" PRIMARY KEY ("id")
      )
    `);

    // Create closure table
    await queryRunner.query(`
      CREATE TABLE "channels_closure" (
        "id_ancestor" uuid NOT NULL,
        "id_descendant" uuid NOT NULL,
        "level" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_channels_closure" PRIMARY KEY ("id_ancestor", "id_descendant")
      )
    `);

    // Foreign key for tree parent
    await queryRunner.query(`
      ALTER TABLE "channels"
      ADD CONSTRAINT "FK_channels_parent"
      FOREIGN KEY ("parentId") REFERENCES "channels"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // Foreign key for agent
    await queryRunner.query(`
      ALTER TABLE "channels"
      ADD CONSTRAINT "FK_channels_agent"
      FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Foreign keys for closure table
    await queryRunner.query(`
      ALTER TABLE "channels_closure"
      ADD CONSTRAINT "FK_channels_closure_ancestor"
      FOREIGN KEY ("id_ancestor") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "channels_closure"
      ADD CONSTRAINT "FK_channels_closure_descendant"
      FOREIGN KEY ("id_descendant") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_channels_closure_ancestor" ON "channels_closure" ("id_ancestor")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_channels_closure_descendant" ON "channels_closure" ("id_descendant")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_channels_name" ON "channels" ("name")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_channels_agentId" ON "channels" ("agentId")
    `);

    // Full-text search
    await queryRunner.query(`
      ALTER TABLE "channels" ADD COLUMN "search_vector" tsvector
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_channels_search_vector" ON "channels" USING GIN ("search_vector")
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION channels_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.purpose, '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER channels_search_vector_trigger
      BEFORE INSERT OR UPDATE ON "channels"
      FOR EACH ROW EXECUTE FUNCTION channels_search_vector_update()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS channels_search_vector_trigger ON "channels"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS channels_search_vector_update()`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_channels_search_vector"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_channels_agentId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_channels_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_channels_closure_descendant"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_channels_closure_ancestor"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "channels_closure"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "channels"`);
  }
}
