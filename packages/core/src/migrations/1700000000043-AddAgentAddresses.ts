import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentAddresses1700000000043 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "addresses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "agentId" uuid NOT NULL,
        "countryId" uuid NOT NULL,
        "label" varchar(50),
        "line1" varchar(255) NOT NULL,
        "line2" varchar(255),
        "city" varchar(255) NOT NULL,
        "region" varchar(255),
        "postalCode" varchar(20) NOT NULL,
        "isPrimary" boolean NOT NULL DEFAULT FALSE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "addresses"
      ADD CONSTRAINT "FK_addresses_agent"
      FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "addresses"
      ADD CONSTRAINT "FK_addresses_country"
      FOREIGN KEY ("countryId") REFERENCES "geographies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_addresses_agent" ON "addresses" ("agentId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_addresses_country" ON "addresses" ("countryId")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_addresses_agent_primary"
      ON "addresses" ("agentId") WHERE "isPrimary" = TRUE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_addresses_agent_primary"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_addresses_country"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_addresses_agent"`);
    await queryRunner.query(`ALTER TABLE "addresses" DROP CONSTRAINT IF EXISTS "FK_addresses_country"`);
    await queryRunner.query(`ALTER TABLE "addresses" DROP CONSTRAINT IF EXISTS "FK_addresses_agent"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "addresses"`);
  }
}
