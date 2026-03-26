import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoices1700000000021 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create invoices table
    await queryRunner.query(`
      CREATE TABLE "invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "number" character varying NOT NULL,
        "fromAgentId" uuid NOT NULL,
        "toAgentId" uuid NOT NULL,
        "issuedAt" TIMESTAMP NOT NULL,
        "dueAt" TIMESTAMP NOT NULL,
        "currencyId" uuid NOT NULL,
        "paid" boolean NOT NULL DEFAULT false,
        "link" text,
        "fileId" uuid,
        "valueStreamId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invoices" PRIMARY KEY ("id")
      )
    `);

    // Create invoice_items table
    await queryRunner.query(`
      CREATE TABLE "invoice_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "invoiceId" uuid NOT NULL,
        "valueId" uuid,
        "valueInstanceId" uuid,
        "quantity" decimal(12,2) NOT NULL,
        "unitPrice" decimal(12,2) NOT NULL,
        "total" decimal(12,2) NOT NULL,
        CONSTRAINT "PK_invoice_items" PRIMARY KEY ("id")
      )
    `);

    // Composite unique index on (fromAgentId, number)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_invoices_fromAgent_number" ON "invoices" ("fromAgentId", "number")
    `);

    // Foreign keys for invoices
    await queryRunner.query(`
      ALTER TABLE "invoices"
      ADD CONSTRAINT "FK_invoices_fromAgent"
      FOREIGN KEY ("fromAgentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "invoices"
      ADD CONSTRAINT "FK_invoices_toAgent"
      FOREIGN KEY ("toAgentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "invoices"
      ADD CONSTRAINT "FK_invoices_currency"
      FOREIGN KEY ("currencyId") REFERENCES "values"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "invoices"
      ADD CONSTRAINT "FK_invoices_file"
      FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "invoices"
      ADD CONSTRAINT "FK_invoices_valueStream"
      FOREIGN KEY ("valueStreamId") REFERENCES "value_streams"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Foreign keys for invoice_items
    await queryRunner.query(`
      ALTER TABLE "invoice_items"
      ADD CONSTRAINT "FK_invoice_items_invoice"
      FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "invoice_items"
      ADD CONSTRAINT "FK_invoice_items_value"
      FOREIGN KEY ("valueId") REFERENCES "values"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "invoice_items"
      ADD CONSTRAINT "FK_invoice_items_valueInstance"
      FOREIGN KEY ("valueInstanceId") REFERENCES "value_instances"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_invoices_fromAgentId" ON "invoices" ("fromAgentId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_invoices_toAgentId" ON "invoices" ("toAgentId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_invoices_currencyId" ON "invoices" ("currencyId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_invoices_paid" ON "invoices" ("paid")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_invoice_items_invoiceId" ON "invoice_items" ("invoiceId")
    `);

    // Full-text search
    await queryRunner.query(`
      ALTER TABLE "invoices" ADD COLUMN "search_vector" tsvector
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_invoices_search_vector" ON "invoices" USING GIN ("search_vector")
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION invoices_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', coalesce(NEW.number, '')), 'A');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER invoices_search_vector_trigger
      BEFORE INSERT OR UPDATE ON "invoices"
      FOR EACH ROW EXECUTE FUNCTION invoices_search_vector_update()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS invoices_search_vector_trigger ON "invoices"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS invoices_search_vector_update()`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invoices_search_vector"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invoice_items_invoiceId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invoices_paid"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invoices_currencyId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invoices_toAgentId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invoices_fromAgentId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invoice_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invoices"`);
  }
}
