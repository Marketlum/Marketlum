import { MigrationInterface, QueryRunner } from "typeorm";

export class AddImageToTaxonomy1737502000000 implements MigrationInterface {
    name = 'AddImageToTaxonomy1737502000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "taxonomy" ADD "imageId" uuid`);
        await queryRunner.query(`ALTER TABLE "taxonomy" ADD CONSTRAINT "FK_taxonomy_image" FOREIGN KEY ("imageId") REFERENCES "file_upload"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "taxonomy" DROP CONSTRAINT "FK_taxonomy_image"`);
        await queryRunner.query(`ALTER TABLE "taxonomy" DROP COLUMN "imageId"`);
    }
}
