import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeTaxonomyDescOptional1742309486242 implements MigrationInterface {
    name = 'MakeTaxonomyDescOptional1742309486242'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "taxonomy" ALTER COLUMN "description" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "taxonomy" ALTER COLUMN "description" SET NOT NULL`);
    }

}
