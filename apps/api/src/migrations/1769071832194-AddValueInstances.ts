import { MigrationInterface, QueryRunner } from "typeorm";

export class AddValueInstances1769071832194 implements MigrationInterface {
    name = 'AddValueInstances1769071832194'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."value_instance_direction_enum" AS ENUM('incoming', 'outgoing', 'internal', 'neutral')`);
        await queryRunner.query(`CREATE TYPE "public"."value_instance_visibility_enum" AS ENUM('public', 'private')`);
        await queryRunner.query(`CREATE TABLE "value_instance" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "valueId" uuid NOT NULL, "name" character varying(200) NOT NULL, "purpose" character varying(500), "version" character varying(50) NOT NULL DEFAULT '1.0', "direction" "public"."value_instance_direction_enum" NOT NULL DEFAULT 'neutral', "fromAgentId" uuid, "toAgentId" uuid, "parentId" uuid, "link" character varying(500), "imageFileId" uuid, "visibility" "public"."value_instance_visibility_enum" NOT NULL DEFAULT 'private', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7d894d7e2c203c50d6cc47b4f39" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "value_instance" ADD CONSTRAINT "FK_9516edbaf5df4ed8d1e97006cc2" FOREIGN KEY ("valueId") REFERENCES "value"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "value_instance" ADD CONSTRAINT "FK_7b76883f434375627fc05297ca7" FOREIGN KEY ("fromAgentId") REFERENCES "agent"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "value_instance" ADD CONSTRAINT "FK_d4df937954c9ea3c3e89c0434d8" FOREIGN KEY ("toAgentId") REFERENCES "agent"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "value_instance" ADD CONSTRAINT "FK_0a2bdac1dc68e39397e16767a67" FOREIGN KEY ("parentId") REFERENCES "value_instance"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "value_instance" ADD CONSTRAINT "FK_02dcd138441906664472bdb9d83" FOREIGN KEY ("imageFileId") REFERENCES "file_upload"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "value_instance" DROP CONSTRAINT "FK_02dcd138441906664472bdb9d83"`);
        await queryRunner.query(`ALTER TABLE "value_instance" DROP CONSTRAINT "FK_0a2bdac1dc68e39397e16767a67"`);
        await queryRunner.query(`ALTER TABLE "value_instance" DROP CONSTRAINT "FK_d4df937954c9ea3c3e89c0434d8"`);
        await queryRunner.query(`ALTER TABLE "value_instance" DROP CONSTRAINT "FK_7b76883f434375627fc05297ca7"`);
        await queryRunner.query(`ALTER TABLE "value_instance" DROP CONSTRAINT "FK_9516edbaf5df4ed8d1e97006cc2"`);
        await queryRunner.query(`DROP TABLE "value_instance"`);
        await queryRunner.query(`DROP TYPE "public"."value_instance_visibility_enum"`);
        await queryRunner.query(`DROP TYPE "public"."value_instance_direction_enum"`);
    }

}
