import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFoldersAndFiles1700000000006 implements MigrationInterface {
  name = 'AddFoldersAndFiles1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "folders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "level" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "parentId" uuid,
        CONSTRAINT "PK_folders" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "folders_closure" (
        "id_ancestor" uuid NOT NULL,
        "id_descendant" uuid NOT NULL,
        "level" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_folders_closure" PRIMARY KEY ("id_ancestor", "id_descendant")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_folders_closure_ancestor" ON "folders_closure" ("id_ancestor")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_folders_closure_descendant" ON "folders_closure" ("id_descendant")`,
    );

    await queryRunner.query(`
      ALTER TABLE "folders"
        ADD CONSTRAINT "FK_folders_parent"
        FOREIGN KEY ("parentId") REFERENCES "folders"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "folders_closure"
        ADD CONSTRAINT "FK_folders_closure_ancestor"
        FOREIGN KEY ("id_ancestor") REFERENCES "folders"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "folders_closure"
        ADD CONSTRAINT "FK_folders_closure_descendant"
        FOREIGN KEY ("id_descendant") REFERENCES "folders"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "files" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "originalName" character varying NOT NULL,
        "storedName" character varying NOT NULL,
        "mimeType" character varying NOT NULL,
        "size" bigint NOT NULL,
        "folderId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_files" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_files_folderId" ON "files" ("folderId")`,
    );

    await queryRunner.query(`
      ALTER TABLE "files"
        ADD CONSTRAINT "FK_files_folder"
        FOREIGN KEY ("folderId") REFERENCES "folders"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "files" DROP CONSTRAINT "FK_files_folder"`);
    await queryRunner.query(`DROP INDEX "IDX_files_folderId"`);
    await queryRunner.query(`DROP TABLE "files"`);
    await queryRunner.query(`ALTER TABLE "folders_closure" DROP CONSTRAINT "FK_folders_closure_descendant"`);
    await queryRunner.query(`ALTER TABLE "folders_closure" DROP CONSTRAINT "FK_folders_closure_ancestor"`);
    await queryRunner.query(`ALTER TABLE "folders" DROP CONSTRAINT "FK_folders_parent"`);
    await queryRunner.query(`DROP INDEX "IDX_folders_closure_descendant"`);
    await queryRunner.query(`DROP INDEX "IDX_folders_closure_ancestor"`);
    await queryRunner.query(`DROP TABLE "folders_closure"`);
    await queryRunner.query(`DROP TABLE "folders"`);
  }
}
