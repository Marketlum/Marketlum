import { MigrationInterface, QueryRunner } from "typeorm";

export class IntroduceAgents1742213455900 implements MigrationInterface {
    name = 'IntroduceAgents1742213455900'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."agent_type_enum" AS ENUM('individual', 'organization', 'virtual')`);
        await queryRunner.query(`CREATE TABLE "agent" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "type" "public"."agent_type_enum" NOT NULL DEFAULT 'organization', CONSTRAINT "PK_1000e989398c5d4ed585cf9a46f" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "agent"`);
        await queryRunner.query(`DROP TYPE "public"."agent_type_enum"`);
    }

}
