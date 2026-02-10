import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddValues1700000000009 implements MigrationInterface {
  name = 'AddValues1700000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "value_type_enum" AS ENUM('product', 'service', 'relationship', 'right')`,
    );

    await queryRunner.query(
      `CREATE TYPE "value_parent_type_enum" AS ENUM('on_top_of', 'part_of')`,
    );

    await queryRunner.query(`
      CREATE TABLE "values" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "type" "value_type_enum" NOT NULL,
        "purpose" text,
        "description" text,
        "link" text,
        "parentType" "value_parent_type_enum",
        "parentId" uuid,
        "agentId" uuid,
        "mainTaxonomyId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_values" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "values"
        ADD CONSTRAINT "FK_values_parent"
        FOREIGN KEY ("parentId") REFERENCES "values"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "values"
        ADD CONSTRAINT "FK_values_agent"
        FOREIGN KEY ("agentId") REFERENCES "agents"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "values"
        ADD CONSTRAINT "FK_values_main_taxonomy"
        FOREIGN KEY ("mainTaxonomyId") REFERENCES "taxonomies"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "value_taxonomies" (
        "valueId" uuid NOT NULL,
        "taxonomyId" uuid NOT NULL,
        CONSTRAINT "PK_value_taxonomies" PRIMARY KEY ("valueId", "taxonomyId")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_value_taxonomies_valueId" ON "value_taxonomies" ("valueId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_value_taxonomies_taxonomyId" ON "value_taxonomies" ("taxonomyId")`,
    );

    await queryRunner.query(`
      ALTER TABLE "value_taxonomies"
        ADD CONSTRAINT "FK_value_taxonomies_value"
        FOREIGN KEY ("valueId") REFERENCES "values"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "value_taxonomies"
        ADD CONSTRAINT "FK_value_taxonomies_taxonomy"
        FOREIGN KEY ("taxonomyId") REFERENCES "taxonomies"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "value_files" (
        "valueId" uuid NOT NULL,
        "fileId" uuid NOT NULL,
        CONSTRAINT "PK_value_files" PRIMARY KEY ("valueId", "fileId")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_value_files_valueId" ON "value_files" ("valueId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_value_files_fileId" ON "value_files" ("fileId")`,
    );

    await queryRunner.query(`
      ALTER TABLE "value_files"
        ADD CONSTRAINT "FK_value_files_value"
        FOREIGN KEY ("valueId") REFERENCES "values"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "value_files"
        ADD CONSTRAINT "FK_value_files_file"
        FOREIGN KEY ("fileId") REFERENCES "files"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "value_files" DROP CONSTRAINT "FK_value_files_file"`);
    await queryRunner.query(`ALTER TABLE "value_files" DROP CONSTRAINT "FK_value_files_value"`);
    await queryRunner.query(`DROP INDEX "IDX_value_files_fileId"`);
    await queryRunner.query(`DROP INDEX "IDX_value_files_valueId"`);
    await queryRunner.query(`DROP TABLE "value_files"`);
    await queryRunner.query(`ALTER TABLE "value_taxonomies" DROP CONSTRAINT "FK_value_taxonomies_taxonomy"`);
    await queryRunner.query(`ALTER TABLE "value_taxonomies" DROP CONSTRAINT "FK_value_taxonomies_value"`);
    await queryRunner.query(`DROP INDEX "IDX_value_taxonomies_taxonomyId"`);
    await queryRunner.query(`DROP INDEX "IDX_value_taxonomies_valueId"`);
    await queryRunner.query(`DROP TABLE "value_taxonomies"`);
    await queryRunner.query(`ALTER TABLE "values" DROP CONSTRAINT "FK_values_main_taxonomy"`);
    await queryRunner.query(`ALTER TABLE "values" DROP CONSTRAINT "FK_values_agent"`);
    await queryRunner.query(`ALTER TABLE "values" DROP CONSTRAINT "FK_values_parent"`);
    await queryRunner.query(`DROP TABLE "values"`);
    await queryRunner.query(`DROP TYPE "value_parent_type_enum"`);
    await queryRunner.query(`DROP TYPE "value_type_enum"`);
  }
}
