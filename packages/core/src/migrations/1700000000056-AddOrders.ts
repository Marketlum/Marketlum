import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrders1700000000056 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE "orders_number_seq"`);
    await queryRunner.query(`
      CREATE TYPE "orders_state_enum" AS ENUM ('draft', 'new', 'processing', 'completed', 'cancelled')
    `);
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "number" character varying NOT NULL,
        "state" "orders_state_enum" NOT NULL DEFAULT 'draft',
        "fromAgentId" uuid NOT NULL,
        "toAgentId" uuid NOT NULL,
        "currencyId" uuid NOT NULL,
        "channelId" uuid,
        "pipelineId" uuid,
        "localeId" uuid,
        "shippingCountryCode" character varying(2),
        "shippingLine1" character varying(255),
        "shippingLine2" character varying(255),
        "shippingCity" character varying(255),
        "shippingPostalCode" character varying(20),
        "billingCountryCode" character varying(2),
        "billingLine1" character varying(255),
        "billingLine2" character varying(255),
        "billingCity" character varying(255),
        "billingPostalCode" character varying(20),
        "total" numeric(14,2) NOT NULL DEFAULT '0',
        "placedAt" TIMESTAMP,
        "completedAt" TIMESTAMP,
        "cancelledAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_orders_number" UNIQUE ("number"),
        CONSTRAINT "PK_orders_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_orders_from_agent" FOREIGN KEY ("fromAgentId")
          REFERENCES "agents"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_orders_to_agent" FOREIGN KEY ("toAgentId")
          REFERENCES "agents"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_orders_currency" FOREIGN KEY ("currencyId")
          REFERENCES "values"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_orders_channel" FOREIGN KEY ("channelId")
          REFERENCES "channels"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_orders_pipeline" FOREIGN KEY ("pipelineId")
          REFERENCES "pipelines"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_orders_locale" FOREIGN KEY ("localeId")
          REFERENCES "locales"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_orders_from_agent" ON "orders" ("fromAgentId")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_to_agent" ON "orders" ("toAgentId")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_currency" ON "orders" ("currencyId")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_channel" ON "orders" ("channelId")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_pipeline" ON "orders" ("pipelineId")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_state" ON "orders" ("state")`);

    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "orderId" uuid NOT NULL,
        "valueId" uuid,
        "valueInstanceId" uuid,
        "quantity" numeric(14,2) NOT NULL,
        "unitPrice" numeric(14,2) NOT NULL,
        "total" numeric(14,2) NOT NULL,
        "position" integer NOT NULL,
        CONSTRAINT "PK_order_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_order_items_order" FOREIGN KEY ("orderId")
          REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_order_items_value" FOREIGN KEY ("valueId")
          REFERENCES "values"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_order_items_value_instance" FOREIGN KEY ("valueInstanceId")
          REFERENCES "value_instances"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_order_items_order" ON "order_items" ("orderId")`);

    await queryRunner.query(`ALTER TABLE "invoices" ADD COLUMN "orderId" uuid`);
    await queryRunner.query(`
      ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_order"
        FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`CREATE INDEX "IDX_invoices_order" ON "invoices" ("orderId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_invoices_order"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_invoices_order"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "orderId"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TYPE "orders_state_enum"`);
    await queryRunner.query(`DROP SEQUENCE "orders_number_seq"`);
  }
}
