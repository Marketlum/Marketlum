import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoles1700000000058 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "code" character varying(64) NOT NULL,
        "parentId" uuid,
        "isSystem" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_roles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_roles_code" UNIQUE ("code"),
        CONSTRAINT "FK_roles_parent" FOREIGN KEY ("parentId")
          REFERENCES "roles"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "roleId" uuid NOT NULL,
        "permission" character varying(100) NOT NULL,
        CONSTRAINT "PK_role_permissions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_role_permissions_role_permission" UNIQUE ("roleId", "permission"),
        CONSTRAINT "FK_role_permissions_role" FOREIGN KEY ("roleId")
          REFERENCES "roles"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_role_permissions_role" ON "role_permissions" ("roleId")`,
    );
    await queryRunner.query(`
      CREATE TABLE "users_roles" (
        "userId" uuid NOT NULL,
        "roleId" uuid NOT NULL,
        CONSTRAINT "PK_users_roles" PRIMARY KEY ("userId", "roleId"),
        CONSTRAINT "FK_users_roles_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_users_roles_role" FOREIGN KEY ("roleId")
          REFERENCES "roles"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_users_roles_role" ON "users_roles" ("roleId")`);

    // Seed the system Admin role with the wildcard grant and grandfather every
    // existing user, so the switch to deny-by-default changes nothing on deploy.
    await queryRunner.query(
      `INSERT INTO "roles" ("name", "code", "isSystem") VALUES ('Admin', 'admin', true)`,
    );
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("roleId", "permission")
      SELECT "id", '*' FROM "roles" WHERE "code" = 'admin'
    `);
    await queryRunner.query(`
      INSERT INTO "users_roles" ("userId", "roleId")
      SELECT u."id", r."id" FROM "users" u CROSS JOIN "roles" r WHERE r."code" = 'admin'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users_roles"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "roles"`);
  }
}
