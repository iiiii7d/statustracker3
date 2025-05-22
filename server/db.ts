import { Generated, Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";

export interface CountTable {
  timestamp: Generated<string>;
  all: number;
  categories: Record<string, number>;
}

export interface PlayerTable {
  id: Generated<number>;
  uuid: string;
  join: string;
  leave: string | null;
}

export interface VersionTable {
  id: 1;
  version: string;
}

export interface Database {
  counts: CountTable;
  players: PlayerTable;
  version: VersionTable;
}

const runtimeConfig = useRuntimeConfig();
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool(runtimeConfig.trackerConfig.db),
  }),
});

db.transaction()
  // eslint-disable-next-line max-lines-per-function
  .execute(async (trx) => {
    // 3.0.0
    if (
      (
        await sql`SELECT FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'version'`.execute(
          trx,
        )
      ).rows.length === 0
    ) {
      console.log("Runnning migrations for v3.0.0");
      await trx.schema
        .createTable("counts")
        .ifNotExists()
        .addColumn("timestamp", "timestamptz", (col) =>
          col.defaultTo(sql`now()`).primaryKey(),
        )
        .addColumn("all", "int2", (col) => col.check(sql`"all" >= 0`).notNull())
        .addColumn("categories", "jsonb", (col) => col.notNull())
        .execute();

      await trx.schema
        .createTable("players")
        .ifNotExists()
        .addColumn("id", "bigserial", (col) => col.primaryKey())
        .addColumn("uuid", "uuid", (col) => col.notNull())
        .addColumn("join", "timestamptz", (col) => col.notNull())
        .addColumn("leave", "timestamptz", (col) =>
          col.check(sql`leave IS NULL OR "join" < leave`),
        )
        .execute();

      await trx.schema
        .createTable("version")
        .ifNotExists()
        .addColumn("id", "int2", (col) =>
          col
            .unique()
            .notNull()
            .check(sql`id = 1`),
        )
        .addColumn("version", "varchar", (col) => col.notNull())
        .execute();

      await trx
        .insertInto("version")
        .values({
          id: 1,
          version: "3.0.0",
        })
        .execute();
    }
  })
  .then();
