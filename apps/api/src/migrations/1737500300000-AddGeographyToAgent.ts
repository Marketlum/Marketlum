import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGeographyToAgent1737500300000 implements MigrationInterface {
    name = 'AddGeographyToAgent1737500300000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "agent"
            ADD "geographyId" uuid
        `);

        await queryRunner.query(`
            ALTER TABLE "agent"
            ADD CONSTRAINT "FK_agent_geography"
            FOREIGN KEY ("geographyId") REFERENCES "geography"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_agent_geography" ON "agent" ("geographyId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_agent_geography"`);
        await queryRunner.query(`ALTER TABLE "agent" DROP CONSTRAINT "FK_agent_geography"`);
        await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "geographyId"`);
    }
}
