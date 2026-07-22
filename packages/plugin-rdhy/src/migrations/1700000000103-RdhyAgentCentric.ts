import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The plugin becomes agent-centric: platforms host agents, VAM agreements
 * anchor to an agent, EMC micro-nodes are agents. Existing platform
 * memberships and VAM/EMC agreements referenced value streams, which have no
 * derivable agent mapping — those rows are cleared (the seed hook recreates
 * sample data).
 */
export class RdhyAgentCentric1700000000103 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Platform membership: agents instead of value streams.
    await queryRunner.query(`DROP TABLE IF EXISTS "plugin_rdhy_platform_value_streams"`);
    await queryRunner.query(`
      CREATE TABLE "plugin_rdhy_platform_agents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "platformId" uuid NOT NULL,
        "agentId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_plugin_rdhy_platform_agents" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_plugin_rdhy_platform_agent" UNIQUE ("agentId"),
        CONSTRAINT "FK_plugin_rdhy_platform_agent_platform" FOREIGN KEY ("platformId")
          REFERENCES "plugin_rdhy_platforms"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_plugin_rdhy_platform_agent_agent" FOREIGN KEY ("agentId")
          REFERENCES "agents"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_plugin_rdhy_platform_agent_platform" ON "plugin_rdhy_platform_agents" ("platformId")`,
    );

    // VAM agreements: anchored to an agent. Existing rows cannot be mapped.
    await queryRunner.query(`DELETE FROM "plugin_rdhy_vam_agreements"`);
    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_vam_agreements" DROP CONSTRAINT IF EXISTS "FK_plugin_rdhy_vam_agr_value_stream"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_plugin_rdhy_vam_agr_value_stream"`);
    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_vam_agreements" DROP COLUMN "valueStreamId"`,
    );
    await queryRunner.query(`ALTER TABLE "plugin_rdhy_vam_agreements" ADD COLUMN "agentId" uuid NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "plugin_rdhy_vam_agreements"
        ADD CONSTRAINT "FK_plugin_rdhy_vam_agr_agent"
        FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_plugin_rdhy_vam_agr_agent" ON "plugin_rdhy_vam_agreements" ("agentId")`,
    );

    // EMC micro-nodes: anchored to agents. Existing nodes cannot be mapped;
    // clearing whole agreements keeps the data story consistent with VAM.
    await queryRunner.query(`DELETE FROM "plugin_rdhy_emc_agreements"`);
    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_emc_nodes" DROP CONSTRAINT IF EXISTS "UQ_plugin_rdhy_emc_node_value_stream"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_emc_nodes" DROP CONSTRAINT IF EXISTS "FK_plugin_rdhy_emc_node_value_stream"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_plugin_rdhy_emc_node_value_stream"`);
    await queryRunner.query(`ALTER TABLE "plugin_rdhy_emc_nodes" DROP COLUMN "valueStreamId"`);
    await queryRunner.query(`ALTER TABLE "plugin_rdhy_emc_nodes" ADD COLUMN "agentId" uuid NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "plugin_rdhy_emc_nodes"
        ADD CONSTRAINT "UQ_plugin_rdhy_emc_node_agent" UNIQUE ("agreementId", "agentId")
    `);
    await queryRunner.query(`
      ALTER TABLE "plugin_rdhy_emc_nodes"
        ADD CONSTRAINT "FK_plugin_rdhy_emc_node_agent"
        FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_plugin_rdhy_emc_node_agent" ON "plugin_rdhy_emc_nodes" ("agentId")`,
    );
  }

  public async down(): Promise<void> {
    throw new Error(
      'The RDHY plugin became agent-centric; restore value-stream anchoring from migrations 100-102 if ever needed.',
    );
  }
}
