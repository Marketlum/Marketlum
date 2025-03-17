import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStreamToValue1742205113690 implements MigrationInterface {
    name = 'AddStreamToValue1742205113690'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "value" ADD "streamId" uuid`);
        await queryRunner.query(`ALTER TABLE "value" ADD CONSTRAINT "FK_f32479e3897f117a8b097230798" FOREIGN KEY ("streamId") REFERENCES "value_stream"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "value" DROP CONSTRAINT "FK_f32479e3897f117a8b097230798"`);
        await queryRunner.query(`ALTER TABLE "value" DROP COLUMN "streamId"`);
    }

}
