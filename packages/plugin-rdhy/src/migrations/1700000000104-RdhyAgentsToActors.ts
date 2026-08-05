import { MigrationInterface, QueryRunner } from 'typeorm';

export class RdhyAgentsToActors1700000000104 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_platform_agents" RENAME TO "plugin_rdhy_platform_actors"`,
    );

    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_platform_actors" RENAME COLUMN "agentId" TO "actorId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_emc_nodes" RENAME COLUMN "agentId" TO "actorId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_vam_agreements" RENAME COLUMN "agentId" TO "actorId"`,
    );

    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_platform_actors" RENAME CONSTRAINT "PK_plugin_rdhy_platform_agents" TO "PK_plugin_rdhy_platform_actors"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_platform_actors" RENAME CONSTRAINT "FK_plugin_rdhy_platform_agent_agent" TO "FK_plugin_rdhy_platform_actor_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_platform_actors" RENAME CONSTRAINT "FK_plugin_rdhy_platform_agent_platform" TO "FK_plugin_rdhy_platform_actor_platform"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_platform_actors" RENAME CONSTRAINT "UQ_plugin_rdhy_platform_agent" TO "UQ_plugin_rdhy_platform_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_emc_nodes" RENAME CONSTRAINT "FK_plugin_rdhy_emc_node_agent" TO "FK_plugin_rdhy_emc_node_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_emc_nodes" RENAME CONSTRAINT "UQ_plugin_rdhy_emc_node_agent" TO "UQ_plugin_rdhy_emc_node_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_vam_agreements" RENAME CONSTRAINT "FK_plugin_rdhy_vam_agr_agent" TO "FK_plugin_rdhy_vam_agr_actor"`,
    );

    await queryRunner.query(
      `ALTER INDEX "IDX_plugin_rdhy_emc_node_agent" RENAME TO "IDX_plugin_rdhy_emc_node_actor"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_plugin_rdhy_platform_agent_platform" RENAME TO "IDX_plugin_rdhy_platform_actor_platform"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_plugin_rdhy_vam_agr_agent" RENAME TO "IDX_plugin_rdhy_vam_agr_actor"`,
    );

    await queryRunner.query(`
      UPDATE "role_permissions"
      SET "permission" = regexp_replace("permission", '^rdhy\\.agents\\.', 'rdhy.actors.')
      WHERE "permission" LIKE 'rdhy.agents.%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "role_permissions"
      SET "permission" = regexp_replace("permission", '^rdhy\\.actors\\.', 'rdhy.agents.')
      WHERE "permission" LIKE 'rdhy.actors.%'
    `);
    await queryRunner.query(
      `ALTER INDEX "IDX_plugin_rdhy_vam_agr_actor" RENAME TO "IDX_plugin_rdhy_vam_agr_agent"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_plugin_rdhy_platform_actor_platform" RENAME TO "IDX_plugin_rdhy_platform_agent_platform"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_plugin_rdhy_emc_node_actor" RENAME TO "IDX_plugin_rdhy_emc_node_agent"`,
    );

    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_vam_agreements" RENAME CONSTRAINT "FK_plugin_rdhy_vam_agr_actor" TO "FK_plugin_rdhy_vam_agr_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_emc_nodes" RENAME CONSTRAINT "UQ_plugin_rdhy_emc_node_actor" TO "UQ_plugin_rdhy_emc_node_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_emc_nodes" RENAME CONSTRAINT "FK_plugin_rdhy_emc_node_actor" TO "FK_plugin_rdhy_emc_node_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_platform_actors" RENAME CONSTRAINT "UQ_plugin_rdhy_platform_actor" TO "UQ_plugin_rdhy_platform_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_platform_actors" RENAME CONSTRAINT "FK_plugin_rdhy_platform_actor_platform" TO "FK_plugin_rdhy_platform_agent_platform"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_platform_actors" RENAME CONSTRAINT "FK_plugin_rdhy_platform_actor_actor" TO "FK_plugin_rdhy_platform_agent_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_platform_actors" RENAME CONSTRAINT "PK_plugin_rdhy_platform_actors" TO "PK_plugin_rdhy_platform_agents"`,
    );

    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_vam_agreements" RENAME COLUMN "actorId" TO "agentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_emc_nodes" RENAME COLUMN "actorId" TO "agentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_platform_actors" RENAME COLUMN "actorId" TO "agentId"`,
    );

    await queryRunner.query(
      `ALTER TABLE "plugin_rdhy_platform_actors" RENAME TO "plugin_rdhy_platform_agents"`,
    );
  }
}
