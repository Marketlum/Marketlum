import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateGeographies1737500200000 implements MigrationInterface {
    name = 'CreateGeographies1737500200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "public"."geography_level_enum" AS ENUM(
                'Planet',
                'Continent',
                'Continental Section',
                'Country',
                'Region',
                'City'
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "geography" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(120) NOT NULL,
                "code" character varying(32) NOT NULL,
                "level" "public"."geography_level_enum" NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "parentId" uuid,
                CONSTRAINT "PK_geography_id" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "geography_closure" (
                "id_ancestor" uuid NOT NULL,
                "id_descendant" uuid NOT NULL,
                CONSTRAINT "PK_geography_closure" PRIMARY KEY ("id_ancestor", "id_descendant")
            )
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_geography_closure_ancestor" ON "geography_closure" ("id_ancestor")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_geography_closure_descendant" ON "geography_closure" ("id_descendant")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_geography_code_parent" ON "geography" ("code", "parentId")
        `);

        await queryRunner.query(`
            ALTER TABLE "geography"
            ADD CONSTRAINT "FK_geography_parent"
            FOREIGN KEY ("parentId") REFERENCES "geography"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "geography_closure"
            ADD CONSTRAINT "FK_geography_closure_ancestor"
            FOREIGN KEY ("id_ancestor") REFERENCES "geography"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "geography_closure"
            ADD CONSTRAINT "FK_geography_closure_descendant"
            FOREIGN KEY ("id_descendant") REFERENCES "geography"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "geography_closure" DROP CONSTRAINT "FK_geography_closure_descendant"`);
        await queryRunner.query(`ALTER TABLE "geography_closure" DROP CONSTRAINT "FK_geography_closure_ancestor"`);
        await queryRunner.query(`ALTER TABLE "geography" DROP CONSTRAINT "FK_geography_parent"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_geography_code_parent"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_geography_closure_descendant"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_geography_closure_ancestor"`);
        await queryRunner.query(`DROP TABLE "geography_closure"`);
        await queryRunner.query(`DROP TABLE "geography"`);
        await queryRunner.query(`DROP TYPE "public"."geography_level_enum"`);
    }
}
