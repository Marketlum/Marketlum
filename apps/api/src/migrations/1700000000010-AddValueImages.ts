import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddValueImages1700000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "value_images" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "valueId" uuid NOT NULL,
        "fileId" uuid NOT NULL,
        "position" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_value_images" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_value_images_valueId_fileId" UNIQUE ("valueId", "fileId"),
        CONSTRAINT "FK_value_images_valueId" FOREIGN KEY ("valueId") REFERENCES "values"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_value_images_fileId" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_value_images_valueId" ON "value_images" ("valueId")`);
    await queryRunner.query(`CREATE INDEX "IDX_value_images_fileId" ON "value_images" ("fileId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "value_images"`);
  }
}
