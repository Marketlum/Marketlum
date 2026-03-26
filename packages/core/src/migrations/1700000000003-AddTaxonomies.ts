import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaxonomies1700000000003 implements MigrationInterface {
  name = 'AddTaxonomies1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "taxonomies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "level" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "parentId" uuid,
        CONSTRAINT "PK_taxonomies" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "taxonomies_closure" (
        "id_ancestor" uuid NOT NULL,
        "id_descendant" uuid NOT NULL,
        "level" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_taxonomies_closure" PRIMARY KEY ("id_ancestor", "id_descendant")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_taxonomies_closure_ancestor" ON "taxonomies_closure" ("id_ancestor")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_taxonomies_closure_descendant" ON "taxonomies_closure" ("id_descendant")`,
    );

    await queryRunner.query(`
      ALTER TABLE "taxonomies"
        ADD CONSTRAINT "FK_taxonomies_parent"
        FOREIGN KEY ("parentId") REFERENCES "taxonomies"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "taxonomies_closure"
        ADD CONSTRAINT "FK_taxonomies_closure_ancestor"
        FOREIGN KEY ("id_ancestor") REFERENCES "taxonomies"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "taxonomies_closure"
        ADD CONSTRAINT "FK_taxonomies_closure_descendant"
        FOREIGN KEY ("id_descendant") REFERENCES "taxonomies"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "taxonomies_closure" DROP CONSTRAINT "FK_taxonomies_closure_descendant"`);
    await queryRunner.query(`ALTER TABLE "taxonomies_closure" DROP CONSTRAINT "FK_taxonomies_closure_ancestor"`);
    await queryRunner.query(`ALTER TABLE "taxonomies" DROP CONSTRAINT "FK_taxonomies_parent"`);
    await queryRunner.query(`DROP INDEX "IDX_taxonomies_closure_descendant"`);
    await queryRunner.query(`DROP INDEX "IDX_taxonomies_closure_ancestor"`);
    await queryRunner.query(`DROP TABLE "taxonomies_closure"`);
    await queryRunner.query(`DROP TABLE "taxonomies"`);
  }
}
