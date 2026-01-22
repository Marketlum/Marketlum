import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExchangesModule1769040252994 implements MigrationInterface {
    name = 'AddExchangesModule1769040252994'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "exchange_party" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "exchangeId" uuid NOT NULL, "agentId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_e5ebaa4665f741b1c472fa6f4b2" UNIQUE ("exchangeId", "agentId"), CONSTRAINT "PK_e070c1e459dbdc8d06ae3f61b3f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "exchange_flow" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "exchangeId" uuid NOT NULL, "fromPartyAgentId" uuid NOT NULL, "toPartyAgentId" uuid NOT NULL, "valueId" uuid NOT NULL, "quantity" numeric(15,4), "note" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_22b531de9730724fdee8c12f79f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."exchange_state_enum" AS ENUM('open', 'completed', 'closed')`);
        await queryRunner.query(`CREATE TABLE "exchange" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, "purpose" character varying(500), "state" "public"."exchange_state_enum" NOT NULL DEFAULT 'open', "completedAt" TIMESTAMP WITH TIME ZONE, "closedAt" TIMESTAMP WITH TIME ZONE, "valueStreamId" uuid NOT NULL, "channelId" uuid, "taxonId" uuid, "agreementId" uuid, "leadUserId" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_cbd4568fcb476b57cebd8239895" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "exchange_party" ADD CONSTRAINT "FK_72d246e018c2793f7a94d60f447" FOREIGN KEY ("exchangeId") REFERENCES "exchange"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exchange_party" ADD CONSTRAINT "FK_643f3570169b09b7b31d1540dd1" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exchange_flow" ADD CONSTRAINT "FK_800bc03e1ee6e404ccd2a61b968" FOREIGN KEY ("exchangeId") REFERENCES "exchange"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exchange_flow" ADD CONSTRAINT "FK_f9ca0cee65bf43c63dca77c39fe" FOREIGN KEY ("fromPartyAgentId") REFERENCES "agent"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exchange_flow" ADD CONSTRAINT "FK_c7e3bbe6a1f224a7272fb8b5c04" FOREIGN KEY ("toPartyAgentId") REFERENCES "agent"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exchange_flow" ADD CONSTRAINT "FK_772b0e6677e6ed510a18b0ddea8" FOREIGN KEY ("valueId") REFERENCES "value"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exchange" ADD CONSTRAINT "FK_5ec08da4dbc6d2a48fd13e80d9a" FOREIGN KEY ("valueStreamId") REFERENCES "value_stream"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exchange" ADD CONSTRAINT "FK_83450e326d8d3597e02e3bca436" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exchange" ADD CONSTRAINT "FK_c9fc8efa18fed12bfb4a7f384d9" FOREIGN KEY ("taxonId") REFERENCES "taxonomy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exchange" ADD CONSTRAINT "FK_833d8e1971ebce6603853edc0d5" FOREIGN KEY ("agreementId") REFERENCES "agreement"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exchange" ADD CONSTRAINT "FK_f15331900f804793bad88c9d75a" FOREIGN KEY ("leadUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "exchange" DROP CONSTRAINT "FK_f15331900f804793bad88c9d75a"`);
        await queryRunner.query(`ALTER TABLE "exchange" DROP CONSTRAINT "FK_833d8e1971ebce6603853edc0d5"`);
        await queryRunner.query(`ALTER TABLE "exchange" DROP CONSTRAINT "FK_c9fc8efa18fed12bfb4a7f384d9"`);
        await queryRunner.query(`ALTER TABLE "exchange" DROP CONSTRAINT "FK_83450e326d8d3597e02e3bca436"`);
        await queryRunner.query(`ALTER TABLE "exchange" DROP CONSTRAINT "FK_5ec08da4dbc6d2a48fd13e80d9a"`);
        await queryRunner.query(`ALTER TABLE "exchange_flow" DROP CONSTRAINT "FK_772b0e6677e6ed510a18b0ddea8"`);
        await queryRunner.query(`ALTER TABLE "exchange_flow" DROP CONSTRAINT "FK_c7e3bbe6a1f224a7272fb8b5c04"`);
        await queryRunner.query(`ALTER TABLE "exchange_flow" DROP CONSTRAINT "FK_f9ca0cee65bf43c63dca77c39fe"`);
        await queryRunner.query(`ALTER TABLE "exchange_flow" DROP CONSTRAINT "FK_800bc03e1ee6e404ccd2a61b968"`);
        await queryRunner.query(`ALTER TABLE "exchange_party" DROP CONSTRAINT "FK_643f3570169b09b7b31d1540dd1"`);
        await queryRunner.query(`ALTER TABLE "exchange_party" DROP CONSTRAINT "FK_72d246e018c2793f7a94d60f447"`);
        await queryRunner.query(`DROP TABLE "exchange"`);
        await queryRunner.query(`DROP TYPE "public"."exchange_state_enum"`);
        await queryRunner.query(`DROP TABLE "exchange_flow"`);
        await queryRunner.query(`DROP TABLE "exchange_party"`);
    }

}
