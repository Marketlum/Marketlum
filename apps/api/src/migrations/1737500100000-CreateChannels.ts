import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateChannels1737500100000 implements MigrationInterface {
    name = 'CreateChannels1737500100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "public"."channel_type_enum" AS ENUM(
                'website',
                'web_app',
                'mobile_app',
                'marketplace',
                'social_media',
                'messaging',
                'email',
                'paid_ads',
                'partner',
                'retail_store',
                'event',
                'field_sales',
                'print',
                'b2b_outbound',
                'b2b_inbound',
                'other'
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "channel" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(120) NOT NULL,
                "purpose" character varying(500),
                "type" "public"."channel_type_enum" NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "parentId" uuid,
                CONSTRAINT "PK_channel_id" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "channel_closure" (
                "id_ancestor" uuid NOT NULL,
                "id_descendant" uuid NOT NULL,
                CONSTRAINT "PK_channel_closure" PRIMARY KEY ("id_ancestor", "id_descendant")
            )
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_channel_closure_ancestor" ON "channel_closure" ("id_ancestor")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_channel_closure_descendant" ON "channel_closure" ("id_descendant")
        `);

        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD CONSTRAINT "FK_channel_parent"
            FOREIGN KEY ("parentId") REFERENCES "channel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "channel_closure"
            ADD CONSTRAINT "FK_channel_closure_ancestor"
            FOREIGN KEY ("id_ancestor") REFERENCES "channel"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "channel_closure"
            ADD CONSTRAINT "FK_channel_closure_descendant"
            FOREIGN KEY ("id_descendant") REFERENCES "channel"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "channel_closure" DROP CONSTRAINT "FK_channel_closure_descendant"`);
        await queryRunner.query(`ALTER TABLE "channel_closure" DROP CONSTRAINT "FK_channel_closure_ancestor"`);
        await queryRunner.query(`ALTER TABLE "channel" DROP CONSTRAINT "FK_channel_parent"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_channel_closure_descendant"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_channel_closure_ancestor"`);
        await queryRunner.query(`DROP TABLE "channel_closure"`);
        await queryRunner.query(`DROP TABLE "channel"`);
        await queryRunner.query(`DROP TYPE "public"."channel_type_enum"`);
    }
}
