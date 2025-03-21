import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeValueStreamPurposeOptional1742571288257 implements MigrationInterface {
    name = 'MakeValueStreamPurposeOptional1742571288257'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "value_stream" ALTER COLUMN "purpose" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "value_stream" ALTER COLUMN "purpose" SET NOT NULL`);
    }

}
