import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeValueDescriptionOptional1742152498778 implements MigrationInterface {
    name = 'MakeValueDescriptionOptional1742152498778'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "value" ALTER COLUMN "description" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "value" ALTER COLUMN "description" SET NOT NULL`);
    }

}
