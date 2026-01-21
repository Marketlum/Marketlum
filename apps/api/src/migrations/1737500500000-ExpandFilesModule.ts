import { MigrationInterface, QueryRunner } from "typeorm";

export class ExpandFilesModule1737500500000 implements MigrationInterface {
    name = 'ExpandFilesModule1737500500000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create storage provider enum
        await queryRunner.query(`
            CREATE TYPE "public"."file_storage_provider_enum" AS ENUM(
                'local',
                's3'
            )
        `);

        // Create folder table
        await queryRunner.query(`
            CREATE TABLE "folder" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(120) NOT NULL,
                "parentId" uuid,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_folder_id" PRIMARY KEY ("id")
            )
        `);

        // Create folder closure table for tree structure
        await queryRunner.query(`
            CREATE TABLE "folder_closure" (
                "id_ancestor" uuid NOT NULL,
                "id_descendant" uuid NOT NULL,
                CONSTRAINT "PK_folder_closure" PRIMARY KEY ("id_ancestor", "id_descendant")
            )
        `);

        // Create indexes for folder closure table
        await queryRunner.query(`
            CREATE INDEX "IDX_folder_closure_ancestor" ON "folder_closure" ("id_ancestor")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_folder_closure_descendant" ON "folder_closure" ("id_descendant")
        `);

        // Add folder self-reference foreign key
        await queryRunner.query(`
            ALTER TABLE "folder"
            ADD CONSTRAINT "FK_folder_parent"
            FOREIGN KEY ("parentId") REFERENCES "folder"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        // Add closure table foreign keys
        await queryRunner.query(`
            ALTER TABLE "folder_closure"
            ADD CONSTRAINT "FK_folder_closure_ancestor"
            FOREIGN KEY ("id_ancestor") REFERENCES "folder"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "folder_closure"
            ADD CONSTRAINT "FK_folder_closure_descendant"
            FOREIGN KEY ("id_descendant") REFERENCES "folder"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        // Add new columns to file_upload table
        await queryRunner.query(`
            ALTER TABLE "file_upload"
            ADD COLUMN "folderId" uuid,
            ADD COLUMN "fileName" character varying(255),
            ADD COLUMN "width" integer,
            ADD COLUMN "height" integer,
            ADD COLUMN "checksum" character varying(64),
            ADD COLUMN "storageProvider" "public"."file_storage_provider_enum" NOT NULL DEFAULT 'local',
            ADD COLUMN "thumbnailKey" character varying(512),
            ADD COLUMN "altText" character varying(500),
            ADD COLUMN "caption" text,
            ADD COLUMN "isArchived" boolean NOT NULL DEFAULT false,
            ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
        `);

        // Populate fileName from storageKey for existing records
        await queryRunner.query(`
            UPDATE "file_upload" SET "fileName" = "storageKey" WHERE "fileName" IS NULL
        `);

        // Make fileName NOT NULL after population
        await queryRunner.query(`
            ALTER TABLE "file_upload" ALTER COLUMN "fileName" SET NOT NULL
        `);

        // Rename uploadedAt to createdAt
        await queryRunner.query(`
            ALTER TABLE "file_upload" RENAME COLUMN "uploadedAt" TO "createdAt"
        `);

        // Add folder foreign key to file_upload
        await queryRunner.query(`
            ALTER TABLE "file_upload"
            ADD CONSTRAINT "FK_file_upload_folder"
            FOREIGN KEY ("folderId") REFERENCES "folder"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        // Create index for folder relationship
        await queryRunner.query(`
            CREATE INDEX "IDX_file_upload_folder" ON "file_upload" ("folderId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop file_upload folder index
        await queryRunner.query(`DROP INDEX "public"."IDX_file_upload_folder"`);

        // Drop file_upload folder foreign key
        await queryRunner.query(`ALTER TABLE "file_upload" DROP CONSTRAINT "FK_file_upload_folder"`);

        // Rename createdAt back to uploadedAt
        await queryRunner.query(`
            ALTER TABLE "file_upload" RENAME COLUMN "createdAt" TO "uploadedAt"
        `);

        // Drop new columns from file_upload
        await queryRunner.query(`
            ALTER TABLE "file_upload"
            DROP COLUMN "folderId",
            DROP COLUMN "fileName",
            DROP COLUMN "width",
            DROP COLUMN "height",
            DROP COLUMN "checksum",
            DROP COLUMN "storageProvider",
            DROP COLUMN "thumbnailKey",
            DROP COLUMN "altText",
            DROP COLUMN "caption",
            DROP COLUMN "isArchived",
            DROP COLUMN "updatedAt"
        `);

        // Drop folder closure table foreign keys
        await queryRunner.query(`ALTER TABLE "folder_closure" DROP CONSTRAINT "FK_folder_closure_descendant"`);
        await queryRunner.query(`ALTER TABLE "folder_closure" DROP CONSTRAINT "FK_folder_closure_ancestor"`);
        await queryRunner.query(`ALTER TABLE "folder" DROP CONSTRAINT "FK_folder_parent"`);

        // Drop folder closure table indexes
        await queryRunner.query(`DROP INDEX "public"."IDX_folder_closure_descendant"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_folder_closure_ancestor"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "folder_closure"`);
        await queryRunner.query(`DROP TABLE "folder"`);

        // Drop enum
        await queryRunner.query(`DROP TYPE "public"."file_storage_provider_enum"`);
    }
}
