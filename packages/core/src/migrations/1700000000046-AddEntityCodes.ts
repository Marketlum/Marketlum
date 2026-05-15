import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLES: { table: string; prefix: string }[] = [
  { table: 'values', prefix: 'value' },
  { table: 'value_instances', prefix: 'value_instance' },
  { table: 'taxonomies', prefix: 'taxonomy' },
  { table: 'channels', prefix: 'channel' },
  { table: 'value_streams', prefix: 'value_stream' },
  { table: 'agreement_templates', prefix: 'agreement_template' },
  { table: 'pipelines', prefix: 'pipeline' },
  { table: 'archetypes', prefix: 'archetype' },
];

export class AddEntityCodes1700000000046 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { table, prefix } of TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "code" varchar(64)`,
      );
      await queryRunner.query(
        `UPDATE "${table}" SET "code" = '${prefix}_' || substr(id::text, 1, 8)`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "code" SET NOT NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "UQ_${table}_code" UNIQUE ("code")`,
      );
    }

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION values_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.purpose, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
          setweight(to_tsvector('simple',  COALESCE(NEW.code, '')), 'D');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`UPDATE "values" SET "name" = "name"`);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION value_instances_search_trigger() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.purpose, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C') ||
          setweight(to_tsvector('simple',  coalesce(NEW.code, '')), 'D');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`UPDATE "value_instances" SET "name" = "name"`);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION value_streams_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.purpose, '')), 'B') ||
          setweight(to_tsvector('simple',  coalesce(NEW.code, '')), 'D');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`UPDATE "value_streams" SET "name" = "name"`);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION channels_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.purpose, '')), 'B') ||
          setweight(to_tsvector('simple',  coalesce(NEW.code, '')), 'D');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`UPDATE "channels" SET "name" = "name"`);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION archetypes_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.purpose, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C') ||
          setweight(to_tsvector('simple',  coalesce(NEW.code, '')), 'D');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`UPDATE "archetypes" SET "name" = "name"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION values_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.purpose, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION value_instances_search_trigger() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.purpose, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION value_streams_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.purpose, '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION channels_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.purpose, '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION archetypes_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.purpose, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    for (const { table } of [...TABLES].reverse()) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "UQ_${table}_code"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "code"`,
      );
    }
  }
}
