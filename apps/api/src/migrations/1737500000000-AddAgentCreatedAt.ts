import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAgentCreatedAt1737500000000 implements MigrationInterface {
    name = 'AddAgentCreatedAt1737500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agent" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "createdAt"`);
    }

}
