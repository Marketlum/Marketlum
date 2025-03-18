import { MigrationInterface, QueryRunner } from "typeorm";

export class RelateValueToAgent1742291064713 implements MigrationInterface {
    name = 'RelateValueToAgent1742291064713'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "value" ADD "agentId" uuid`);
        await queryRunner.query(`ALTER TABLE "value" ADD CONSTRAINT "FK_ea8966700820c5c4d375dfc28f3" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "value" DROP CONSTRAINT "FK_ea8966700820c5c4d375dfc28f3"`);
        await queryRunner.query(`ALTER TABLE "value" DROP COLUMN "agentId"`);
    }

}
