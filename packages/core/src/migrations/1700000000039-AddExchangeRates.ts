import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExchangeRates1700000000039 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "exchange_rates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "fromValueId" uuid NOT NULL,
        "toValueId" uuid NOT NULL,
        "rate" numeric(20,10) NOT NULL,
        "effectiveAt" TIMESTAMP NOT NULL,
        "source" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_exchange_rates" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_exchange_rates_canonical_order" CHECK ("fromValueId" < "toValueId"),
        CONSTRAINT "CHK_exchange_rates_rate_positive" CHECK ("rate" > 0),
        CONSTRAINT "UQ_exchange_rates_pair_at" UNIQUE ("fromValueId", "toValueId", "effectiveAt")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "exchange_rates"
      ADD CONSTRAINT "FK_exchange_rates_from_value"
      FOREIGN KEY ("fromValueId") REFERENCES "values"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "exchange_rates"
      ADD CONSTRAINT "FK_exchange_rates_to_value"
      FOREIGN KEY ("toValueId") REFERENCES "values"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_exchange_rates_lookup" ON "exchange_rates" ("fromValueId", "toValueId", "effectiveAt")
    `);

    await queryRunner.query(`
      CREATE TABLE "system_settings" (
        "key" varchar(64) NOT NULL,
        "value" text NOT NULL,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_system_settings" PRIMARY KEY ("key")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "system_settings"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_exchange_rates_lookup"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exchange_rates"`);
  }
}
