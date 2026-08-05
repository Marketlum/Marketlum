import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameAgentsToActors1700000000060 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tables
    await queryRunner.query(`ALTER TABLE "agents" RENAME TO "actors"`);
    await queryRunner.query(`ALTER TABLE "agents_closure" RENAME TO "actors_closure"`);
    await queryRunner.query(`ALTER TABLE "agent_taxonomies" RENAME TO "actor_taxonomies"`);

    // Enum type (values unchanged)
    await queryRunner.query(`ALTER TYPE "agent_type_enum" RENAME TO "actor_type_enum"`);

    // Columns on referencing tables
    await queryRunner.query(`ALTER TABLE "actor_taxonomies" RENAME COLUMN "agentId" TO "actorId"`);
    await queryRunner.query(`ALTER TABLE "addresses" RENAME COLUMN "agentId" TO "actorId"`);
    await queryRunner.query(`ALTER TABLE "accounts" RENAME COLUMN "agentId" TO "actorId"`);
    await queryRunner.query(`ALTER TABLE "channels" RENAME COLUMN "agentId" TO "actorId"`);
    await queryRunner.query(`ALTER TABLE "offerings" RENAME COLUMN "agentId" TO "actorId"`);
    await queryRunner.query(`ALTER TABLE "tensions" RENAME COLUMN "agentId" TO "actorId"`);
    await queryRunner.query(`ALTER TABLE "values" RENAME COLUMN "agentId" TO "actorId"`);
    await queryRunner.query(
      `ALTER TABLE "agreement_templates" RENAME COLUMN "agentId" TO "actorId"`,
    );
    await queryRunner.query(`ALTER TABLE "agreement_parties" RENAME COLUMN "agentId" TO "actorId"`);
    await queryRunner.query(`ALTER TABLE "exchange_parties" RENAME COLUMN "agentId" TO "actorId"`);
    await queryRunner.query(
      `ALTER TABLE "exchange_flows" RENAME COLUMN "fromAgentId" TO "fromActorId"`,
    );
    await queryRunner.query(`ALTER TABLE "exchange_flows" RENAME COLUMN "toAgentId" TO "toActorId"`);
    await queryRunner.query(`ALTER TABLE "orders" RENAME COLUMN "fromAgentId" TO "fromActorId"`);
    await queryRunner.query(`ALTER TABLE "orders" RENAME COLUMN "toAgentId" TO "toActorId"`);
    await queryRunner.query(
      `ALTER TABLE "value_instances" RENAME COLUMN "fromAgentId" TO "fromActorId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "value_instances" RENAME COLUMN "toAgentId" TO "toActorId"`,
    );
    await queryRunner.query(`ALTER TABLE "invoices" RENAME COLUMN "fromAgentId" TO "fromActorId"`);
    await queryRunner.query(`ALTER TABLE "invoices" RENAME COLUMN "toAgentId" TO "toActorId"`);
    await queryRunner.query(
      `ALTER TABLE "invoices" RENAME COLUMN "onBehalfOfAgentId" TO "onBehalfOfActorId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoice_items" RENAME COLUMN "fromAgentAmount" TO "fromActorAmount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoice_items" RENAME COLUMN "fromAgentRate" TO "fromActorRate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoice_items" RENAME COLUMN "toAgentAmount" TO "toActorAmount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoice_items" RENAME COLUMN "toAgentRate" TO "toActorRate"`,
    );

    // Constraints (renaming a constraint also renames its backing index)
    await queryRunner.query(`ALTER TABLE "actors" RENAME CONSTRAINT "PK_agents" TO "PK_actors"`);
    await queryRunner.query(
      `ALTER TABLE "actors" RENAME CONSTRAINT "FK_agents_parent" TO "FK_actors_parent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actors" RENAME CONSTRAINT "FK_agents_main_taxonomy" TO "FK_actors_main_taxonomy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actors" RENAME CONSTRAINT "FK_agents_image" TO "FK_actors_image"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actors" RENAME CONSTRAINT "FK_agents_functional_currency" TO "FK_actors_functional_currency"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actors_closure" RENAME CONSTRAINT "PK_agents_closure" TO "PK_actors_closure"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actors_closure" RENAME CONSTRAINT "FK_agents_closure_ancestor" TO "FK_actors_closure_ancestor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actors_closure" RENAME CONSTRAINT "FK_agents_closure_descendant" TO "FK_actors_closure_descendant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actor_taxonomies" RENAME CONSTRAINT "PK_agent_taxonomies" TO "PK_actor_taxonomies"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actor_taxonomies" RENAME CONSTRAINT "FK_agent_taxonomies_agent" TO "FK_actor_taxonomies_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actor_taxonomies" RENAME CONSTRAINT "FK_agent_taxonomies_taxonomy" TO "FK_actor_taxonomies_taxonomy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "addresses" RENAME CONSTRAINT "FK_addresses_agent" TO "FK_addresses_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" RENAME CONSTRAINT "FK_accounts_agent" TO "FK_accounts_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channels" RENAME CONSTRAINT "FK_channels_agent" TO "FK_channels_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "offerings" RENAME CONSTRAINT "FK_offerings_agent" TO "FK_offerings_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tensions" RENAME CONSTRAINT "FK_tensions_agent" TO "FK_tensions_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "values" RENAME CONSTRAINT "FK_values_agent" TO "FK_values_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agreement_templates" RENAME CONSTRAINT "FK_agreement_templates_agent" TO "FK_agreement_templates_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agreement_parties" RENAME CONSTRAINT "FK_agreement_parties_agent" TO "FK_agreement_parties_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exchange_parties" RENAME CONSTRAINT "FK_exchange_parties_agent" TO "FK_exchange_parties_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exchange_flows" RENAME CONSTRAINT "FK_exchange_flows_fromAgent" TO "FK_exchange_flows_fromActor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exchange_flows" RENAME CONSTRAINT "FK_exchange_flows_toAgent" TO "FK_exchange_flows_toActor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" RENAME CONSTRAINT "FK_orders_from_agent" TO "FK_orders_from_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" RENAME CONSTRAINT "FK_orders_to_agent" TO "FK_orders_to_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "value_instances" RENAME CONSTRAINT "FK_value_instances_fromAgent" TO "FK_value_instances_fromActor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "value_instances" RENAME CONSTRAINT "FK_value_instances_toAgent" TO "FK_value_instances_toActor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" RENAME CONSTRAINT "FK_invoices_fromAgent" TO "FK_invoices_fromActor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" RENAME CONSTRAINT "FK_invoices_toAgent" TO "FK_invoices_toActor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" RENAME CONSTRAINT "FK_invoices_onBehalfOfAgent" TO "FK_invoices_onBehalfOfActor"`,
    );

    // Plain indexes (constraint-backed ones were renamed above)
    await queryRunner.query(`ALTER INDEX "IDX_agents_parent" RENAME TO "IDX_actors_parent"`);
    await queryRunner.query(
      `ALTER INDEX "IDX_agents_search_vector" RENAME TO "IDX_actors_search_vector"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_agents_functional_currency" RENAME TO "IDX_actors_functional_currency"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_agents_closure_ancestor" RENAME TO "IDX_actors_closure_ancestor"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_agents_closure_descendant" RENAME TO "IDX_actors_closure_descendant"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_agent_taxonomies_agent" RENAME TO "IDX_actor_taxonomies_actor"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_agent_taxonomies_taxonomy" RENAME TO "IDX_actor_taxonomies_taxonomy"`,
    );
    await queryRunner.query(`ALTER INDEX "IDX_addresses_agent" RENAME TO "IDX_addresses_actor"`);
    await queryRunner.query(
      `ALTER INDEX "IDX_addresses_agent_primary" RENAME TO "IDX_addresses_actor_primary"`,
    );
    await queryRunner.query(`ALTER INDEX "IDX_accounts_agentId" RENAME TO "IDX_accounts_actorId"`);
    await queryRunner.query(`ALTER INDEX "IDX_channels_agentId" RENAME TO "IDX_channels_actorId"`);
    await queryRunner.query(
      `ALTER INDEX "IDX_offerings_agentId" RENAME TO "IDX_offerings_actorId"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_agreement_templates_agent" RENAME TO "IDX_agreement_templates_actor"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_agreement_parties_agentId" RENAME TO "IDX_agreement_parties_actorId"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_exchange_parties_agentId" RENAME TO "IDX_exchange_parties_actorId"`,
    );
    await queryRunner.query(
      `ALTER INDEX "UQ_exchange_parties_exchange_agent" RENAME TO "UQ_exchange_parties_exchange_actor"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_invoices_fromAgentId" RENAME TO "IDX_invoices_fromActorId"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_invoices_toAgentId" RENAME TO "IDX_invoices_toActorId"`,
    );
    await queryRunner.query(
      `ALTER INDEX "UQ_invoices_fromAgent_number" RENAME TO "UQ_invoices_fromActor_number"`,
    );
    await queryRunner.query(`ALTER INDEX "IDX_orders_from_agent" RENAME TO "IDX_orders_from_actor"`);
    await queryRunner.query(`ALTER INDEX "IDX_orders_to_agent" RENAME TO "IDX_orders_to_actor"`);
    await queryRunner.query(
      `ALTER INDEX "IDX_value_instances_fromAgentId" RENAME TO "IDX_value_instances_fromActorId"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_value_instances_toAgentId" RENAME TO "IDX_value_instances_toActorId"`,
    );

    // Search-vector trigger + function, recreated under actor names
    await queryRunner.query(`DROP TRIGGER "agents_search_vector_trigger" ON "actors"`);
    await queryRunner.query(`DROP FUNCTION "agents_search_vector_update"()`);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION actors_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.purpose, '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER actors_search_vector_trigger
        BEFORE INSERT OR UPDATE ON "actors"
        FOR EACH ROW EXECUTE FUNCTION actors_search_vector_update();
    `);

    // Stored permission data: covers seeded and custom HRBAC roles
    await queryRunner.query(`
      UPDATE "role_permissions"
      SET "permission" = regexp_replace("permission", '^agents\\.', 'actors.')
      WHERE "permission" LIKE 'agents.%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "role_permissions"
      SET "permission" = regexp_replace("permission", '^actors\\.', 'agents.')
      WHERE "permission" LIKE 'actors.%'
    `);

    await queryRunner.query(`DROP TRIGGER "actors_search_vector_trigger" ON "actors"`);
    await queryRunner.query(`DROP FUNCTION "actors_search_vector_update"()`);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION agents_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.purpose, '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(
      `ALTER INDEX "IDX_value_instances_toActorId" RENAME TO "IDX_value_instances_toAgentId"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_value_instances_fromActorId" RENAME TO "IDX_value_instances_fromAgentId"`,
    );
    await queryRunner.query(`ALTER INDEX "IDX_orders_to_actor" RENAME TO "IDX_orders_to_agent"`);
    await queryRunner.query(`ALTER INDEX "IDX_orders_from_actor" RENAME TO "IDX_orders_from_agent"`);
    await queryRunner.query(
      `ALTER INDEX "UQ_invoices_fromActor_number" RENAME TO "UQ_invoices_fromAgent_number"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_invoices_toActorId" RENAME TO "IDX_invoices_toAgentId"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_invoices_fromActorId" RENAME TO "IDX_invoices_fromAgentId"`,
    );
    await queryRunner.query(
      `ALTER INDEX "UQ_exchange_parties_exchange_actor" RENAME TO "UQ_exchange_parties_exchange_agent"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_exchange_parties_actorId" RENAME TO "IDX_exchange_parties_agentId"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_agreement_parties_actorId" RENAME TO "IDX_agreement_parties_agentId"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_agreement_templates_actor" RENAME TO "IDX_agreement_templates_agent"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_offerings_actorId" RENAME TO "IDX_offerings_agentId"`,
    );
    await queryRunner.query(`ALTER INDEX "IDX_channels_actorId" RENAME TO "IDX_channels_agentId"`);
    await queryRunner.query(`ALTER INDEX "IDX_accounts_actorId" RENAME TO "IDX_accounts_agentId"`);
    await queryRunner.query(
      `ALTER INDEX "IDX_addresses_actor_primary" RENAME TO "IDX_addresses_agent_primary"`,
    );
    await queryRunner.query(`ALTER INDEX "IDX_addresses_actor" RENAME TO "IDX_addresses_agent"`);
    await queryRunner.query(
      `ALTER INDEX "IDX_actor_taxonomies_taxonomy" RENAME TO "IDX_agent_taxonomies_taxonomy"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_actor_taxonomies_actor" RENAME TO "IDX_agent_taxonomies_agent"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_actors_closure_descendant" RENAME TO "IDX_agents_closure_descendant"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_actors_closure_ancestor" RENAME TO "IDX_agents_closure_ancestor"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_actors_functional_currency" RENAME TO "IDX_agents_functional_currency"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_actors_search_vector" RENAME TO "IDX_agents_search_vector"`,
    );
    await queryRunner.query(`ALTER INDEX "IDX_actors_parent" RENAME TO "IDX_agents_parent"`);

    await queryRunner.query(
      `ALTER TABLE "invoices" RENAME CONSTRAINT "FK_invoices_onBehalfOfActor" TO "FK_invoices_onBehalfOfAgent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" RENAME CONSTRAINT "FK_invoices_toActor" TO "FK_invoices_toAgent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" RENAME CONSTRAINT "FK_invoices_fromActor" TO "FK_invoices_fromAgent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "value_instances" RENAME CONSTRAINT "FK_value_instances_toActor" TO "FK_value_instances_toAgent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "value_instances" RENAME CONSTRAINT "FK_value_instances_fromActor" TO "FK_value_instances_fromAgent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" RENAME CONSTRAINT "FK_orders_to_actor" TO "FK_orders_to_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" RENAME CONSTRAINT "FK_orders_from_actor" TO "FK_orders_from_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exchange_flows" RENAME CONSTRAINT "FK_exchange_flows_toActor" TO "FK_exchange_flows_toAgent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exchange_flows" RENAME CONSTRAINT "FK_exchange_flows_fromActor" TO "FK_exchange_flows_fromAgent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exchange_parties" RENAME CONSTRAINT "FK_exchange_parties_actor" TO "FK_exchange_parties_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agreement_parties" RENAME CONSTRAINT "FK_agreement_parties_actor" TO "FK_agreement_parties_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agreement_templates" RENAME CONSTRAINT "FK_agreement_templates_actor" TO "FK_agreement_templates_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "values" RENAME CONSTRAINT "FK_values_actor" TO "FK_values_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tensions" RENAME CONSTRAINT "FK_tensions_actor" TO "FK_tensions_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "offerings" RENAME CONSTRAINT "FK_offerings_actor" TO "FK_offerings_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channels" RENAME CONSTRAINT "FK_channels_actor" TO "FK_channels_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" RENAME CONSTRAINT "FK_accounts_actor" TO "FK_accounts_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "addresses" RENAME CONSTRAINT "FK_addresses_actor" TO "FK_addresses_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actor_taxonomies" RENAME CONSTRAINT "FK_actor_taxonomies_taxonomy" TO "FK_agent_taxonomies_taxonomy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actor_taxonomies" RENAME CONSTRAINT "FK_actor_taxonomies_actor" TO "FK_agent_taxonomies_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actor_taxonomies" RENAME CONSTRAINT "PK_actor_taxonomies" TO "PK_agent_taxonomies"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actors_closure" RENAME CONSTRAINT "FK_actors_closure_descendant" TO "FK_agents_closure_descendant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actors_closure" RENAME CONSTRAINT "FK_actors_closure_ancestor" TO "FK_agents_closure_ancestor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actors_closure" RENAME CONSTRAINT "PK_actors_closure" TO "PK_agents_closure"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actors" RENAME CONSTRAINT "FK_actors_functional_currency" TO "FK_agents_functional_currency"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actors" RENAME CONSTRAINT "FK_actors_image" TO "FK_agents_image"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actors" RENAME CONSTRAINT "FK_actors_main_taxonomy" TO "FK_agents_main_taxonomy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actors" RENAME CONSTRAINT "FK_actors_parent" TO "FK_agents_parent"`,
    );
    await queryRunner.query(`ALTER TABLE "actors" RENAME CONSTRAINT "PK_actors" TO "PK_agents"`);

    await queryRunner.query(
      `ALTER TABLE "invoice_items" RENAME COLUMN "toActorRate" TO "toAgentRate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoice_items" RENAME COLUMN "toActorAmount" TO "toAgentAmount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoice_items" RENAME COLUMN "fromActorRate" TO "fromAgentRate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoice_items" RENAME COLUMN "fromActorAmount" TO "fromAgentAmount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" RENAME COLUMN "onBehalfOfActorId" TO "onBehalfOfAgentId"`,
    );
    await queryRunner.query(`ALTER TABLE "invoices" RENAME COLUMN "toActorId" TO "toAgentId"`);
    await queryRunner.query(`ALTER TABLE "invoices" RENAME COLUMN "fromActorId" TO "fromAgentId"`);
    await queryRunner.query(
      `ALTER TABLE "value_instances" RENAME COLUMN "toActorId" TO "toAgentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "value_instances" RENAME COLUMN "fromActorId" TO "fromAgentId"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" RENAME COLUMN "toActorId" TO "toAgentId"`);
    await queryRunner.query(`ALTER TABLE "orders" RENAME COLUMN "fromActorId" TO "fromAgentId"`);
    await queryRunner.query(
      `ALTER TABLE "exchange_flows" RENAME COLUMN "toActorId" TO "toAgentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exchange_flows" RENAME COLUMN "fromActorId" TO "fromAgentId"`,
    );
    await queryRunner.query(`ALTER TABLE "exchange_parties" RENAME COLUMN "actorId" TO "agentId"`);
    await queryRunner.query(`ALTER TABLE "agreement_parties" RENAME COLUMN "actorId" TO "agentId"`);
    await queryRunner.query(
      `ALTER TABLE "agreement_templates" RENAME COLUMN "actorId" TO "agentId"`,
    );
    await queryRunner.query(`ALTER TABLE "values" RENAME COLUMN "actorId" TO "agentId"`);
    await queryRunner.query(`ALTER TABLE "tensions" RENAME COLUMN "actorId" TO "agentId"`);
    await queryRunner.query(`ALTER TABLE "offerings" RENAME COLUMN "actorId" TO "agentId"`);
    await queryRunner.query(`ALTER TABLE "channels" RENAME COLUMN "actorId" TO "agentId"`);
    await queryRunner.query(`ALTER TABLE "accounts" RENAME COLUMN "actorId" TO "agentId"`);
    await queryRunner.query(`ALTER TABLE "addresses" RENAME COLUMN "actorId" TO "agentId"`);
    await queryRunner.query(`ALTER TABLE "actor_taxonomies" RENAME COLUMN "actorId" TO "agentId"`);

    await queryRunner.query(`ALTER TYPE "actor_type_enum" RENAME TO "agent_type_enum"`);

    await queryRunner.query(`ALTER TABLE "actor_taxonomies" RENAME TO "agent_taxonomies"`);
    await queryRunner.query(`ALTER TABLE "actors_closure" RENAME TO "agents_closure"`);
    await queryRunner.query(`ALTER TABLE "actors" RENAME TO "agents"`);

    await queryRunner.query(`
      CREATE TRIGGER agents_search_vector_trigger
        BEFORE INSERT OR UPDATE ON "agents"
        FOR EACH ROW EXECUTE FUNCTION agents_search_vector_update();
    `);
  }
}
