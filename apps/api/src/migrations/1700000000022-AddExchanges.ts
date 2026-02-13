import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExchanges1700000000022 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create exchange_state_enum
    await queryRunner.query(`
      CREATE TYPE "exchange_state_enum" AS ENUM ('open', 'closed', 'completed')
    `);

    // Create exchanges table
    await queryRunner.query(`
      CREATE TABLE "exchanges" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "purpose" text NOT NULL,
        "description" text,
        "valueStreamId" uuid,
        "channelId" uuid,
        "state" "exchange_state_enum" NOT NULL DEFAULT 'open',
        "openedAt" TIMESTAMP NOT NULL,
        "completedAt" TIMESTAMP,
        "link" text,
        "leadUserId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_exchanges" PRIMARY KEY ("id")
      )
    `);

    // Create exchange_parties table
    await queryRunner.query(`
      CREATE TABLE "exchange_parties" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "exchangeId" uuid NOT NULL,
        "agentId" uuid NOT NULL,
        "role" character varying NOT NULL,
        CONSTRAINT "PK_exchange_parties" PRIMARY KEY ("id")
      )
    `);

    // Create exchange_flows table
    await queryRunner.query(`
      CREATE TABLE "exchange_flows" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "exchangeId" uuid NOT NULL,
        "valueId" uuid,
        "valueInstanceId" uuid,
        "fromAgentId" uuid NOT NULL,
        "toAgentId" uuid NOT NULL,
        "quantity" decimal(12,2) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_exchange_flows" PRIMARY KEY ("id")
      )
    `);

    // Unique constraint on exchange_parties (exchangeId, agentId)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_exchange_parties_exchange_agent" ON "exchange_parties" ("exchangeId", "agentId")
    `);

    // Foreign keys for exchanges
    await queryRunner.query(`
      ALTER TABLE "exchanges"
      ADD CONSTRAINT "FK_exchanges_valueStream"
      FOREIGN KEY ("valueStreamId") REFERENCES "value_streams"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "exchanges"
      ADD CONSTRAINT "FK_exchanges_channel"
      FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "exchanges"
      ADD CONSTRAINT "FK_exchanges_leadUser"
      FOREIGN KEY ("leadUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Foreign keys for exchange_parties
    await queryRunner.query(`
      ALTER TABLE "exchange_parties"
      ADD CONSTRAINT "FK_exchange_parties_exchange"
      FOREIGN KEY ("exchangeId") REFERENCES "exchanges"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "exchange_parties"
      ADD CONSTRAINT "FK_exchange_parties_agent"
      FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Foreign keys for exchange_flows
    await queryRunner.query(`
      ALTER TABLE "exchange_flows"
      ADD CONSTRAINT "FK_exchange_flows_exchange"
      FOREIGN KEY ("exchangeId") REFERENCES "exchanges"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "exchange_flows"
      ADD CONSTRAINT "FK_exchange_flows_value"
      FOREIGN KEY ("valueId") REFERENCES "values"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "exchange_flows"
      ADD CONSTRAINT "FK_exchange_flows_valueInstance"
      FOREIGN KEY ("valueInstanceId") REFERENCES "value_instances"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "exchange_flows"
      ADD CONSTRAINT "FK_exchange_flows_fromAgent"
      FOREIGN KEY ("fromAgentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "exchange_flows"
      ADD CONSTRAINT "FK_exchange_flows_toAgent"
      FOREIGN KEY ("toAgentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_exchanges_state" ON "exchanges" ("state")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_exchanges_channelId" ON "exchanges" ("channelId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_exchanges_valueStreamId" ON "exchanges" ("valueStreamId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_exchanges_leadUserId" ON "exchanges" ("leadUserId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_exchange_parties_exchangeId" ON "exchange_parties" ("exchangeId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_exchange_parties_agentId" ON "exchange_parties" ("agentId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_exchange_flows_exchangeId" ON "exchange_flows" ("exchangeId")
    `);

    // Full-text search
    await queryRunner.query(`
      ALTER TABLE "exchanges" ADD COLUMN "search_vector" tsvector
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_exchanges_search_vector" ON "exchanges" USING GIN ("search_vector")
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION exchanges_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.purpose, '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER exchanges_search_vector_trigger
      BEFORE INSERT OR UPDATE ON "exchanges"
      FOR EACH ROW EXECUTE FUNCTION exchanges_search_vector_update()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS exchanges_search_vector_trigger ON "exchanges"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS exchanges_search_vector_update()`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_exchanges_search_vector"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_exchange_flows_exchangeId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_exchange_parties_agentId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_exchange_parties_exchangeId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_exchanges_leadUserId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_exchanges_valueStreamId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_exchanges_channelId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_exchanges_state"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exchange_flows"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exchange_parties"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exchanges"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "exchange_state_enum"`);
  }
}
