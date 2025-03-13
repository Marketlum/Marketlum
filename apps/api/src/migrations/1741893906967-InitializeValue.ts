import { MigrationInterface, QueryRunner } from "typeorm";

export class InitializeValue1741893906967 implements MigrationInterface {
    name = 'InitializeValue1741893906967'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "value" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying NOT NULL, CONSTRAINT "PK_0af87b1623a34dd5357bfdb38a4" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "value"`);
    }

}
