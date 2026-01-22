import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvoices1769076001818 implements MigrationInterface {
    name = 'AddInvoices1769076001818'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "invoice_item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "invoiceId" uuid NOT NULL, "valueId" uuid, "valueInstanceId" uuid, "quantity" numeric(12,4) NOT NULL, "description" character varying(500), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_48f84fad0e46d1c50d61a90df8c" UNIQUE ("invoiceId", "valueInstanceId"), CONSTRAINT "UQ_481ad08fbaef519d5b940504b60" UNIQUE ("invoiceId", "valueId"), CONSTRAINT "CHK_2aeb13ebfb9e47034c3fa33f26" CHECK (("valueId" IS NOT NULL AND "valueInstanceId" IS NULL) OR ("valueId" IS NULL AND "valueInstanceId" IS NOT NULL)), CONSTRAINT "PK_621317346abdf61295516f3cb76" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "invoice" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fromAgentId" uuid NOT NULL, "toAgentId" uuid NOT NULL, "number" character varying(100) NOT NULL, "issuedAt" date NOT NULL, "dueAt" date NOT NULL, "link" character varying(500), "fileId" uuid, "note" character varying(2000), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_05f33431935e9425d6dfb0cf750" UNIQUE ("fromAgentId", "number"), CONSTRAINT "PK_15d25c200d9bcd8a33f698daf18" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "invoice_item" ADD CONSTRAINT "FK_553d5aac210d22fdca5c8d48ead" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoice_item" ADD CONSTRAINT "FK_0d8c740577d57ec1ef6a3dc61b0" FOREIGN KEY ("valueId") REFERENCES "value"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoice_item" ADD CONSTRAINT "FK_c47903fd81b5798f98bc204ef1a" FOREIGN KEY ("valueInstanceId") REFERENCES "value_instance"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD CONSTRAINT "FK_1c476379a447c18a0be58895c58" FOREIGN KEY ("fromAgentId") REFERENCES "agent"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD CONSTRAINT "FK_77bff4a1efe84a7ef7ae9cca232" FOREIGN KEY ("toAgentId") REFERENCES "agent"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD CONSTRAINT "FK_3e2104bb9d662916cfb11fff13b" FOREIGN KEY ("fileId") REFERENCES "file_upload"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoice" DROP CONSTRAINT "FK_3e2104bb9d662916cfb11fff13b"`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP CONSTRAINT "FK_77bff4a1efe84a7ef7ae9cca232"`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP CONSTRAINT "FK_1c476379a447c18a0be58895c58"`);
        await queryRunner.query(`ALTER TABLE "invoice_item" DROP CONSTRAINT "FK_c47903fd81b5798f98bc204ef1a"`);
        await queryRunner.query(`ALTER TABLE "invoice_item" DROP CONSTRAINT "FK_0d8c740577d57ec1ef6a3dc61b0"`);
        await queryRunner.query(`ALTER TABLE "invoice_item" DROP CONSTRAINT "FK_553d5aac210d22fdca5c8d48ead"`);
        await queryRunner.query(`DROP TABLE "invoice"`);
        await queryRunner.query(`DROP TABLE "invoice_item"`);
    }

}
