import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLedger1700000000017 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "valueId" uuid NOT NULL,
        "agentId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_accounts_value" FOREIGN KEY ("valueId") REFERENCES "values"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_accounts_agent" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_accounts_valueId" ON "accounts" ("valueId")`);
    await queryRunner.query(`CREATE INDEX "IDX_accounts_agentId" ON "accounts" ("agentId")`);

    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "description" text,
        "fromAccountId" uuid NOT NULL,
        "toAccountId" uuid NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transactions_fromAccount" FOREIGN KEY ("fromAccountId") REFERENCES "accounts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_transactions_toAccount" FOREIGN KEY ("toAccountId") REFERENCES "accounts"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_transactions_different_accounts" CHECK ("fromAccountId" <> "toAccountId")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_transactions_fromAccountId" ON "transactions" ("fromAccountId")`);
    await queryRunner.query(`CREATE INDEX "IDX_transactions_toAccountId" ON "transactions" ("toAccountId")`);
    await queryRunner.query(`CREATE INDEX "IDX_transactions_timestamp" ON "transactions" ("timestamp")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TABLE "accounts"`);
  }
}
