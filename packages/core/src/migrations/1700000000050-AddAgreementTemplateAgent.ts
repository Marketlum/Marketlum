import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgreementTemplateAgent1700000000050 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "agreement_templates"
      ADD COLUMN "agentId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "agreement_templates"
      ADD CONSTRAINT "FK_agreement_templates_agent"
      FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_agreement_templates_agent" ON "agreement_templates" ("agentId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_agreement_templates_agent"`);
    await queryRunner.query(`
      ALTER TABLE "agreement_templates" DROP CONSTRAINT "FK_agreement_templates_agent"
    `);
    await queryRunner.query(`ALTER TABLE "agreement_templates" DROP COLUMN "agentId"`);
  }
}
