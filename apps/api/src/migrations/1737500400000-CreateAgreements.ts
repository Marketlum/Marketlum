import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAgreements1737500400000 implements MigrationInterface {
    name = 'CreateAgreements1737500400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create file_upload table
        await queryRunner.query(`
            CREATE TABLE "file_upload" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "originalName" character varying(255) NOT NULL,
                "mimeType" character varying(127) NOT NULL,
                "sizeBytes" integer NOT NULL,
                "storageKey" character varying(512) NOT NULL,
                "uploadedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_file_upload_id" PRIMARY KEY ("id")
            )
        `);

        // Create agreement category enum
        await queryRunner.query(`
            CREATE TYPE "public"."agreement_category_enum" AS ENUM(
                'internal_market',
                'external_market'
            )
        `);

        // Create agreement gateway enum
        await queryRunner.query(`
            CREATE TYPE "public"."agreement_gateway_enum" AS ENUM(
                'pen_and_paper',
                'notary',
                'docu_sign',
                'other'
            )
        `);

        // Create agreement party role enum
        await queryRunner.query(`
            CREATE TYPE "public"."agreement_party_role_enum" AS ENUM(
                'buyer',
                'seller',
                'service_provider',
                'client',
                'partner',
                'employee',
                'employer',
                'other'
            )
        `);

        // Create agreement table
        await queryRunner.query(`
            CREATE TABLE "agreement" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "title" character varying(200) NOT NULL,
                "category" "public"."agreement_category_enum" NOT NULL,
                "gateway" "public"."agreement_gateway_enum" NOT NULL,
                "link" character varying(2048),
                "content" text,
                "completedAt" TIMESTAMP,
                "parentId" uuid,
                "fileId" uuid,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_agreement_id" PRIMARY KEY ("id")
            )
        `);

        // Create agreement closure table for tree structure
        await queryRunner.query(`
            CREATE TABLE "agreement_closure" (
                "id_ancestor" uuid NOT NULL,
                "id_descendant" uuid NOT NULL,
                CONSTRAINT "PK_agreement_closure" PRIMARY KEY ("id_ancestor", "id_descendant")
            )
        `);

        // Create indexes for closure table
        await queryRunner.query(`
            CREATE INDEX "IDX_agreement_closure_ancestor" ON "agreement_closure" ("id_ancestor")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_agreement_closure_descendant" ON "agreement_closure" ("id_descendant")
        `);

        // Create agreement_party join table
        await queryRunner.query(`
            CREATE TABLE "agreement_party" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "agreementId" uuid NOT NULL,
                "agentId" uuid NOT NULL,
                "role" "public"."agreement_party_role_enum",
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_agreement_party_id" PRIMARY KEY ("id")
            )
        `);

        // Create indexes
        await queryRunner.query(`
            CREATE INDEX "IDX_agreement_party_agreement" ON "agreement_party" ("agreementId")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_agreement_party_agent" ON "agreement_party" ("agentId")
        `);

        // Add foreign keys
        await queryRunner.query(`
            ALTER TABLE "agreement"
            ADD CONSTRAINT "FK_agreement_parent"
            FOREIGN KEY ("parentId") REFERENCES "agreement"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "agreement"
            ADD CONSTRAINT "FK_agreement_file"
            FOREIGN KEY ("fileId") REFERENCES "file_upload"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "agreement_closure"
            ADD CONSTRAINT "FK_agreement_closure_ancestor"
            FOREIGN KEY ("id_ancestor") REFERENCES "agreement"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "agreement_closure"
            ADD CONSTRAINT "FK_agreement_closure_descendant"
            FOREIGN KEY ("id_descendant") REFERENCES "agreement"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "agreement_party"
            ADD CONSTRAINT "FK_agreement_party_agreement"
            FOREIGN KEY ("agreementId") REFERENCES "agreement"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "agreement_party"
            ADD CONSTRAINT "FK_agreement_party_agent"
            FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys
        await queryRunner.query(`ALTER TABLE "agreement_party" DROP CONSTRAINT "FK_agreement_party_agent"`);
        await queryRunner.query(`ALTER TABLE "agreement_party" DROP CONSTRAINT "FK_agreement_party_agreement"`);
        await queryRunner.query(`ALTER TABLE "agreement_closure" DROP CONSTRAINT "FK_agreement_closure_descendant"`);
        await queryRunner.query(`ALTER TABLE "agreement_closure" DROP CONSTRAINT "FK_agreement_closure_ancestor"`);
        await queryRunner.query(`ALTER TABLE "agreement" DROP CONSTRAINT "FK_agreement_file"`);
        await queryRunner.query(`ALTER TABLE "agreement" DROP CONSTRAINT "FK_agreement_parent"`);

        // Drop indexes
        await queryRunner.query(`DROP INDEX "public"."IDX_agreement_party_agent"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_agreement_party_agreement"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_agreement_closure_descendant"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_agreement_closure_ancestor"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "agreement_party"`);
        await queryRunner.query(`DROP TABLE "agreement_closure"`);
        await queryRunner.query(`DROP TABLE "agreement"`);
        await queryRunner.query(`DROP TABLE "file_upload"`);

        // Drop enums
        await queryRunner.query(`DROP TYPE "public"."agreement_party_role_enum"`);
        await queryRunner.query(`DROP TYPE "public"."agreement_gateway_enum"`);
        await queryRunner.query(`DROP TYPE "public"."agreement_category_enum"`);
    }
}
