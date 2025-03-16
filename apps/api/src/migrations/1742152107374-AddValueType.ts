import { MigrationInterface, QueryRunner } from "typeorm";

export class AddValueType1742152107374 implements MigrationInterface {
    name = 'AddValueType1742152107374'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."value_type_enum" AS ENUM('product', 'service', 'relationship', 'right')`);
        await queryRunner.query(`ALTER TABLE "value" ADD "type" "public"."value_type_enum" NOT NULL DEFAULT 'product'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "value" DROP COLUMN "type"`);
        await queryRunner.query(`DROP TYPE "public"."value_type_enum"`);
    }

}
