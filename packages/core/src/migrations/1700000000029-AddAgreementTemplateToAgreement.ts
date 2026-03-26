import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgreementTemplateToAgreement1700000000029 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "agreements"
      ADD COLUMN "agreementTemplateId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "agreements"
      ADD CONSTRAINT "FK_agreements_agreement_template"
      FOREIGN KEY ("agreementTemplateId") REFERENCES "agreement_templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_agreements_agreement_template" ON "agreements" ("agreementTemplateId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agreements_agreement_template"`);
    await queryRunner.query(`ALTER TABLE "agreements" DROP CONSTRAINT IF EXISTS "FK_agreements_agreement_template"`);
    await queryRunner.query(`ALTER TABLE "agreements" DROP COLUMN IF EXISTS "agreementTemplateId"`);
  }
}
