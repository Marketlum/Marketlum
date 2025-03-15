import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeValueTree1742053580214 implements MigrationInterface {
    name = 'MakeValueTree1742053580214'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "value_closure" ("id_ancestor" uuid NOT NULL, "id_descendant" uuid NOT NULL, CONSTRAINT "PK_beb9d2c810b6b842b72d5d466e1" PRIMARY KEY ("id_ancestor", "id_descendant"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ff195f596322c4f23d9c2b427c" ON "value_closure" ("id_ancestor") `);
        await queryRunner.query(`CREATE INDEX "IDX_8524c77215349e8ced30b9f8ae" ON "value_closure" ("id_descendant") `);
        await queryRunner.query(`CREATE TYPE "public"."value_parenttype_enum" AS ENUM('on_top_of', 'part_of')`);
        await queryRunner.query(`ALTER TABLE "value" ADD "parentType" "public"."value_parenttype_enum" NOT NULL DEFAULT 'on_top_of'`);
        await queryRunner.query(`ALTER TABLE "value" ADD "parentId" uuid`);
        await queryRunner.query(`ALTER TABLE "value" ADD CONSTRAINT "FK_0ed44e10dce71b2c390612515db" FOREIGN KEY ("parentId") REFERENCES "value"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "value_closure" ADD CONSTRAINT "FK_ff195f596322c4f23d9c2b427c2" FOREIGN KEY ("id_ancestor") REFERENCES "value"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "value_closure" ADD CONSTRAINT "FK_8524c77215349e8ced30b9f8aef" FOREIGN KEY ("id_descendant") REFERENCES "value"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "value_closure" DROP CONSTRAINT "FK_8524c77215349e8ced30b9f8aef"`);
        await queryRunner.query(`ALTER TABLE "value_closure" DROP CONSTRAINT "FK_ff195f596322c4f23d9c2b427c2"`);
        await queryRunner.query(`ALTER TABLE "value" DROP CONSTRAINT "FK_0ed44e10dce71b2c390612515db"`);
        await queryRunner.query(`ALTER TABLE "value" DROP COLUMN "parentId"`);
        await queryRunner.query(`ALTER TABLE "value" DROP COLUMN "parentType"`);
        await queryRunner.query(`DROP TYPE "public"."value_parenttype_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8524c77215349e8ced30b9f8ae"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ff195f596322c4f23d9c2b427c"`);
        await queryRunner.query(`DROP TABLE "value_closure"`);
    }

}
