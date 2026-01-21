import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLedger1737500700000 implements MigrationInterface {
    name = 'CreateLedger1737500700000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create account table
        await queryRunner.query(`
            CREATE TABLE "account" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(160) NOT NULL,
                "description" text,
                "ownerAgentId" uuid NOT NULL,
                "valueId" uuid NOT NULL,
                "balance" numeric(20,6) NOT NULL DEFAULT '0',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_account_id" PRIMARY KEY ("id")
            )
        `);

        // Create ledger_transaction table
        await queryRunner.query(`
            CREATE TABLE "ledger_transaction" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "fromAccountId" uuid NOT NULL,
                "toAccountId" uuid NOT NULL,
                "amount" numeric(20,6) NOT NULL,
                "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
                "verified" boolean NOT NULL DEFAULT false,
                "note" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_ledger_transaction_id" PRIMARY KEY ("id")
            )
        `);

        // Create indexes for account
        await queryRunner.query(`
            CREATE INDEX "IDX_account_ownerAgentId" ON "account" ("ownerAgentId")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_account_valueId" ON "account" ("valueId")
        `);

        // Create indexes for ledger_transaction
        await queryRunner.query(`
            CREATE INDEX "IDX_ledger_transaction_fromAccountId" ON "ledger_transaction" ("fromAccountId")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_ledger_transaction_toAccountId" ON "ledger_transaction" ("toAccountId")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_ledger_transaction_timestamp" ON "ledger_transaction" ("timestamp")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_ledger_transaction_verified" ON "ledger_transaction" ("verified")
        `);

        // Add foreign keys for account
        await queryRunner.query(`
            ALTER TABLE "account"
            ADD CONSTRAINT "FK_account_ownerAgent"
            FOREIGN KEY ("ownerAgentId") REFERENCES "agent"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "account"
            ADD CONSTRAINT "FK_account_value"
            FOREIGN KEY ("valueId") REFERENCES "value"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

        // Add foreign keys for ledger_transaction
        await queryRunner.query(`
            ALTER TABLE "ledger_transaction"
            ADD CONSTRAINT "FK_ledger_transaction_fromAccount"
            FOREIGN KEY ("fromAccountId") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "ledger_transaction"
            ADD CONSTRAINT "FK_ledger_transaction_toAccount"
            FOREIGN KEY ("toAccountId") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

        // Add check constraint to prevent same account transactions
        await queryRunner.query(`
            ALTER TABLE "ledger_transaction"
            ADD CONSTRAINT "CHK_ledger_transaction_different_accounts"
            CHECK ("fromAccountId" != "toAccountId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop check constraint
        await queryRunner.query(`ALTER TABLE "ledger_transaction" DROP CONSTRAINT "CHK_ledger_transaction_different_accounts"`);

        // Drop foreign keys
        await queryRunner.query(`ALTER TABLE "ledger_transaction" DROP CONSTRAINT "FK_ledger_transaction_toAccount"`);
        await queryRunner.query(`ALTER TABLE "ledger_transaction" DROP CONSTRAINT "FK_ledger_transaction_fromAccount"`);
        await queryRunner.query(`ALTER TABLE "account" DROP CONSTRAINT "FK_account_value"`);
        await queryRunner.query(`ALTER TABLE "account" DROP CONSTRAINT "FK_account_ownerAgent"`);

        // Drop indexes
        await queryRunner.query(`DROP INDEX "public"."IDX_ledger_transaction_verified"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ledger_transaction_timestamp"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ledger_transaction_toAccountId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ledger_transaction_fromAccountId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_account_valueId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_account_ownerAgentId"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "ledger_transaction"`);
        await queryRunner.query(`DROP TABLE "account"`);
    }
}
