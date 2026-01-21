import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFilesToValue1737501000000 implements MigrationInterface {
    name = 'AddFilesToValue1737501000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create join table for Value-FileUpload many-to-many relationship
        await queryRunner.query(`
            CREATE TABLE "value_files" (
                "valueId" uuid NOT NULL,
                "fileId" uuid NOT NULL,
                "position" integer NOT NULL DEFAULT 0,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_value_files" PRIMARY KEY ("valueId", "fileId")
            )
        `);

        // Create indexes
        await queryRunner.query(`
            CREATE INDEX "IDX_value_files_valueId" ON "value_files" ("valueId")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_value_files_fileId" ON "value_files" ("fileId")
        `);

        // Add foreign keys
        await queryRunner.query(`
            ALTER TABLE "value_files"
            ADD CONSTRAINT "FK_value_files_value"
            FOREIGN KEY ("valueId") REFERENCES "value"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "value_files"
            ADD CONSTRAINT "FK_value_files_file"
            FOREIGN KEY ("fileId") REFERENCES "file_upload"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "value_files" DROP CONSTRAINT "FK_value_files_file"`);
        await queryRunner.query(`ALTER TABLE "value_files" DROP CONSTRAINT "FK_value_files_value"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_value_files_fileId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_value_files_valueId"`);
        await queryRunner.query(`DROP TABLE "value_files"`);
    }
}
