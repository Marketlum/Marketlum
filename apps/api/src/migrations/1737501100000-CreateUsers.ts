import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsers1737501100000 implements MigrationInterface {
    name = 'CreateUsers1737501100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create user table
        await queryRunner.query(`
            CREATE TABLE "user" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying(255) NOT NULL,
                "passwordHash" character varying(255) NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "avatarFileId" uuid,
                "agentId" uuid NOT NULL,
                "relationshipAgreementId" uuid,
                "birthday" date,
                "joinedAt" date,
                "leftAt" date,
                "defaultLocaleId" uuid NOT NULL,
                "lastLoginAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_user_email" UNIQUE ("email"),
                CONSTRAINT "UQ_user_agentId" UNIQUE ("agentId")
            )
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "IDX_user_email" ON "user" ("email")`);
        await queryRunner.query(`CREATE INDEX "IDX_user_agentId" ON "user" ("agentId")`);

        // Create foreign keys
        await queryRunner.query(`
            ALTER TABLE "user"
            ADD CONSTRAINT "FK_user_avatarFile"
            FOREIGN KEY ("avatarFileId") REFERENCES "file_upload"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "user"
            ADD CONSTRAINT "FK_user_agent"
            FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "user"
            ADD CONSTRAINT "FK_user_relationshipAgreement"
            FOREIGN KEY ("relationshipAgreementId") REFERENCES "agreement"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "user"
            ADD CONSTRAINT "FK_user_defaultLocale"
            FOREIGN KEY ("defaultLocaleId") REFERENCES "locale"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

        // Create password_reset_token table
        await queryRunner.query(`
            CREATE TABLE "password_reset_token" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "tokenHash" character varying(255) NOT NULL,
                "expiresAt" TIMESTAMP NOT NULL,
                "usedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_password_reset_token_id" PRIMARY KEY ("id")
            )
        `);

        // Create indexes for password_reset_token
        await queryRunner.query(`CREATE INDEX "IDX_password_reset_token_userId" ON "password_reset_token" ("userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_password_reset_token_tokenHash" ON "password_reset_token" ("tokenHash")`);

        // Create foreign key for password_reset_token
        await queryRunner.query(`
            ALTER TABLE "password_reset_token"
            ADD CONSTRAINT "FK_password_reset_token_user"
            FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop password_reset_token table
        await queryRunner.query(`ALTER TABLE "password_reset_token" DROP CONSTRAINT "FK_password_reset_token_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_password_reset_token_tokenHash"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_password_reset_token_userId"`);
        await queryRunner.query(`DROP TABLE "password_reset_token"`);

        // Drop user table
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_user_defaultLocale"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_user_relationshipAgreement"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_user_agent"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_user_avatarFile"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_agentId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_email"`);
        await queryRunner.query(`DROP TABLE "user"`);
    }
}
