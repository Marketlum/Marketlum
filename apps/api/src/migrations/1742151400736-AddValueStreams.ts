import { MigrationInterface, QueryRunner } from "typeorm";

export class AddValueStreams1742151400736 implements MigrationInterface {
    name = 'AddValueStreams1742151400736'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "value_stream" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "purpose" character varying NOT NULL, "parentId" uuid, CONSTRAINT "PK_2d55b1018c9f5cba5ab8aae671f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "value_stream_closure" ("id_ancestor" uuid NOT NULL, "id_descendant" uuid NOT NULL, CONSTRAINT "PK_e632dcb83a69328b42bc15c1cda" PRIMARY KEY ("id_ancestor", "id_descendant"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f97ae90e776f1685a40d7dc8bb" ON "value_stream_closure" ("id_ancestor") `);
        await queryRunner.query(`CREATE INDEX "IDX_c4ad046bcc9307e9d72f8ae9f5" ON "value_stream_closure" ("id_descendant") `);
        await queryRunner.query(`ALTER TABLE "value_stream" ADD CONSTRAINT "FK_c22e3336d8df877dda668a93e8a" FOREIGN KEY ("parentId") REFERENCES "value_stream"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "value_stream_closure" ADD CONSTRAINT "FK_f97ae90e776f1685a40d7dc8bbf" FOREIGN KEY ("id_ancestor") REFERENCES "value_stream"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "value_stream_closure" ADD CONSTRAINT "FK_c4ad046bcc9307e9d72f8ae9f5e" FOREIGN KEY ("id_descendant") REFERENCES "value_stream"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "value_stream_closure" DROP CONSTRAINT "FK_c4ad046bcc9307e9d72f8ae9f5e"`);
        await queryRunner.query(`ALTER TABLE "value_stream_closure" DROP CONSTRAINT "FK_f97ae90e776f1685a40d7dc8bbf"`);
        await queryRunner.query(`ALTER TABLE "value_stream" DROP CONSTRAINT "FK_c22e3336d8df877dda668a93e8a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c4ad046bcc9307e9d72f8ae9f5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f97ae90e776f1685a40d7dc8bb"`);
        await queryRunner.query(`DROP TABLE "value_stream_closure"`);
        await queryRunner.query(`DROP TABLE "value_stream"`);
    }

}
