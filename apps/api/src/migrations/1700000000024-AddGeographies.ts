import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGeographies1700000000024 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create geography_type enum
    await queryRunner.query(`
      CREATE TYPE "geography_type" AS ENUM (
        'planet',
        'continent',
        'continental_section',
        'country',
        'region',
        'city',
        'district'
      )
    `);

    // Create geographies table
    await queryRunner.query(`
      CREATE TABLE "geographies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "code" character varying NOT NULL,
        "type" "geography_type" NOT NULL,
        "level" integer NOT NULL DEFAULT 0,
        "parentId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_geographies" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_geographies_code" UNIQUE ("code")
      )
    `);

    // Create closure table
    await queryRunner.query(`
      CREATE TABLE "geographies_closure" (
        "id_ancestor" uuid NOT NULL,
        "id_descendant" uuid NOT NULL,
        "level" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_geographies_closure" PRIMARY KEY ("id_ancestor", "id_descendant")
      )
    `);

    // Foreign key for tree parent
    await queryRunner.query(`
      ALTER TABLE "geographies"
      ADD CONSTRAINT "FK_geographies_parent"
      FOREIGN KEY ("parentId") REFERENCES "geographies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // Foreign keys for closure table
    await queryRunner.query(`
      ALTER TABLE "geographies_closure"
      ADD CONSTRAINT "FK_geographies_closure_ancestor"
      FOREIGN KEY ("id_ancestor") REFERENCES "geographies"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "geographies_closure"
      ADD CONSTRAINT "FK_geographies_closure_descendant"
      FOREIGN KEY ("id_descendant") REFERENCES "geographies"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_geographies_closure_ancestor" ON "geographies_closure" ("id_ancestor")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_geographies_closure_descendant" ON "geographies_closure" ("id_descendant")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_geographies_name" ON "geographies" ("name")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_geographies_code" ON "geographies" ("code")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_geographies_type" ON "geographies" ("type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_geographies_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_geographies_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_geographies_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_geographies_closure_descendant"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_geographies_closure_ancestor"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "geographies_closure"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "geographies"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "geography_type"`);
  }
}
