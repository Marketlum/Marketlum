import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRdhyPlatformTables1700000000100 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "plugin_rdhy_platforms" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(64) NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_plugin_rdhy_platforms" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_plugin_rdhy_platforms_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "plugin_rdhy_platform_value_streams" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "platformId" uuid NOT NULL,
        "valueStreamId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_plugin_rdhy_platform_value_streams" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_plugin_rdhy_pvs_value_stream" UNIQUE ("valueStreamId"),
        CONSTRAINT "FK_plugin_rdhy_pvs_platform" FOREIGN KEY ("platformId")
          REFERENCES "plugin_rdhy_platforms"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_plugin_rdhy_pvs_value_stream" FOREIGN KEY ("valueStreamId")
          REFERENCES "value_streams"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_plugin_rdhy_pvs_platform"
        ON "plugin_rdhy_platform_value_streams" ("platformId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "plugin_rdhy_platform_value_streams"`);
    await queryRunner.query(`DROP TABLE "plugin_rdhy_platforms"`);
  }
}
