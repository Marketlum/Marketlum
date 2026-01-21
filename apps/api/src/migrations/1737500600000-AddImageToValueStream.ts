import { MigrationInterface, QueryRunner } from "typeorm";

export class AddImageToValueStream1737500600000 implements MigrationInterface {
    name = 'AddImageToValueStream1737500600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add imageId column to value_stream table
        await queryRunner.query(`
            ALTER TABLE "value_stream"
            ADD COLUMN "imageId" uuid
        `);

        // Add foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "value_stream"
            ADD CONSTRAINT "FK_value_stream_image"
            FOREIGN KEY ("imageId") REFERENCES "file_upload"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraint
        await queryRunner.query(`ALTER TABLE "value_stream" DROP CONSTRAINT "FK_value_stream_image"`);

        // Drop column
        await queryRunner.query(`ALTER TABLE "value_stream" DROP COLUMN "imageId"`);
    }
}
