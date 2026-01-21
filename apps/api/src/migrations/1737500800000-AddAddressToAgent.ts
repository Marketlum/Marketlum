import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAddressToAgent1737500800000 implements MigrationInterface {
    name = 'AddAddressToAgent1737500800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add address columns to agent table
        await queryRunner.query(`
            ALTER TABLE "agent"
            ADD COLUMN "street" character varying(255),
            ADD COLUMN "city" character varying(120),
            ADD COLUMN "postalCode" character varying(20),
            ADD COLUMN "country" character varying(120),
            ADD COLUMN "latitude" decimal(10,8),
            ADD COLUMN "longitude" decimal(11,8)
        `);

        // Create partial index for agents with coordinates (for map queries)
        await queryRunner.query(`
            CREATE INDEX "IDX_agent_coordinates"
            ON "agent" ("latitude", "longitude")
            WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop index
        await queryRunner.query(`DROP INDEX "public"."IDX_agent_coordinates"`);

        // Remove columns
        await queryRunner.query(`
            ALTER TABLE "agent"
            DROP COLUMN "street",
            DROP COLUMN "city",
            DROP COLUMN "postalCode",
            DROP COLUMN "country",
            DROP COLUMN "latitude",
            DROP COLUMN "longitude"
        `);
    }
}
