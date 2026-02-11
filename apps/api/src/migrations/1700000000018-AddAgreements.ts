import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgreements1700000000018 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create agreements table
    await queryRunner.query(`
      CREATE TABLE "agreements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "content" text,
        "link" text,
        "level" integer NOT NULL DEFAULT 0,
        "parentId" uuid,
        "fileId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_agreements" PRIMARY KEY ("id")
      )
    `);

    // Create closure table
    await queryRunner.query(`
      CREATE TABLE "agreements_closure" (
        "id_ancestor" uuid NOT NULL,
        "id_descendant" uuid NOT NULL,
        "level" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_agreements_closure" PRIMARY KEY ("id_ancestor", "id_descendant")
      )
    `);

    // Create agreement_parties join table
    await queryRunner.query(`
      CREATE TABLE "agreement_parties" (
        "agreementId" uuid NOT NULL,
        "agentId" uuid NOT NULL,
        CONSTRAINT "PK_agreement_parties" PRIMARY KEY ("agreementId", "agentId")
      )
    `);

    // Foreign keys for agreements
    await queryRunner.query(`
      ALTER TABLE "agreements"
      ADD CONSTRAINT "FK_agreements_parent"
      FOREIGN KEY ("parentId") REFERENCES "agreements"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "agreements"
      ADD CONSTRAINT "FK_agreements_file"
      FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Foreign keys for closure table
    await queryRunner.query(`
      ALTER TABLE "agreements_closure"
      ADD CONSTRAINT "FK_agreements_closure_ancestor"
      FOREIGN KEY ("id_ancestor") REFERENCES "agreements"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "agreements_closure"
      ADD CONSTRAINT "FK_agreements_closure_descendant"
      FOREIGN KEY ("id_descendant") REFERENCES "agreements"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Foreign keys for agreement_parties
    await queryRunner.query(`
      ALTER TABLE "agreement_parties"
      ADD CONSTRAINT "FK_agreement_parties_agreement"
      FOREIGN KEY ("agreementId") REFERENCES "agreements"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "agreement_parties"
      ADD CONSTRAINT "FK_agreement_parties_agent"
      FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Indexes on closure table
    await queryRunner.query(`
      CREATE INDEX "IDX_agreements_closure_ancestor" ON "agreements_closure" ("id_ancestor")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_agreements_closure_descendant" ON "agreements_closure" ("id_descendant")
    `);

    // Indexes on agreement_parties
    await queryRunner.query(`
      CREATE INDEX "IDX_agreement_parties_agreementId" ON "agreement_parties" ("agreementId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_agreement_parties_agentId" ON "agreement_parties" ("agentId")
    `);

    // Full-text search
    await queryRunner.query(`
      ALTER TABLE "agreements" ADD COLUMN "search_vector" tsvector
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_agreements_search_vector" ON "agreements" USING GIN ("search_vector")
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION agreements_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER agreements_search_vector_trigger
      BEFORE INSERT OR UPDATE ON "agreements"
      FOR EACH ROW EXECUTE FUNCTION agreements_search_vector_update()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS agreements_search_vector_trigger ON "agreements"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS agreements_search_vector_update()`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agreements_search_vector"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agreement_parties_agentId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agreement_parties_agreementId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agreements_closure_descendant"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agreements_closure_ancestor"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agreement_parties"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agreements_closure"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agreements"`);
  }
}
