import { MigrationInterface, QueryRunner } from "typeorm";

export class IntroduceTaxonomies1742298108219 implements MigrationInterface {
    name = 'IntroduceTaxonomies1742298108219'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "taxonomy" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying NOT NULL, "link" character varying, "parentId" uuid, CONSTRAINT "PK_36dd19c538ef0f3d368a5ed1e09" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "taxonomy_closure" ("id_ancestor" uuid NOT NULL, "id_descendant" uuid NOT NULL, CONSTRAINT "PK_f221e3733af0ced57c48d41200a" PRIMARY KEY ("id_ancestor", "id_descendant"))`);
        await queryRunner.query(`CREATE INDEX "IDX_fc098d4c3edc5d8c38e223655c" ON "taxonomy_closure" ("id_ancestor") `);
        await queryRunner.query(`CREATE INDEX "IDX_468d8f5b5809c6c66714601bc4" ON "taxonomy_closure" ("id_descendant") `);
        await queryRunner.query(`ALTER TABLE "taxonomy" ADD CONSTRAINT "FK_4fb69b794e4809058d4ca3a2e57" FOREIGN KEY ("parentId") REFERENCES "taxonomy"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "taxonomy_closure" ADD CONSTRAINT "FK_fc098d4c3edc5d8c38e223655ca" FOREIGN KEY ("id_ancestor") REFERENCES "taxonomy"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "taxonomy_closure" ADD CONSTRAINT "FK_468d8f5b5809c6c66714601bc4d" FOREIGN KEY ("id_descendant") REFERENCES "taxonomy"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "taxonomy_closure" DROP CONSTRAINT "FK_468d8f5b5809c6c66714601bc4d"`);
        await queryRunner.query(`ALTER TABLE "taxonomy_closure" DROP CONSTRAINT "FK_fc098d4c3edc5d8c38e223655ca"`);
        await queryRunner.query(`ALTER TABLE "taxonomy" DROP CONSTRAINT "FK_4fb69b794e4809058d4ca3a2e57"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_468d8f5b5809c6c66714601bc4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fc098d4c3edc5d8c38e223655c"`);
        await queryRunner.query(`DROP TABLE "taxonomy_closure"`);
        await queryRunner.query(`DROP TABLE "taxonomy"`);
    }

}
