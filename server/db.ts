import { Temporal } from "temporal-polyfill";
import { Generated, Kysely, PostgresDialect, sql } from "kysely";
import { types as pgTypes, Pool } from "pg";

export interface CountTable {
  timestamp: Generated<Temporal.ZonedDateTime>;
  all: number;
  categories: Record<string, number>;
}

export interface PlayerTable {
  id: Generated<number>;
  uuid: string;
  join: Temporal.ZonedDateTime;
  leave: Temporal.ZonedDateTime | null;
}

export interface VersionTable {
  id: 1
  version: string
}

export interface Database {
  counts: CountTable;
  players: PlayerTable;
  version: VersionTable
}

pgTypes.setTypeParser(pgTypes.builtins.TIMESTAMPTZ, (val) =>
  Temporal.ZonedDateTime.from(val),
);

const runtimeConfig = useRuntimeConfig();
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool(runtimeConfig.trackerConfig.db),
  }),
});

db.transaction().execute(async trx => {
  // 3.0.0
  if ((await sql`SELECT FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'version'`.execute(trx)).rows.length === 0) {
    await trx.schema.createTable("counts").ifNotExists()
      .addColumn("timestamp", "timestamptz", col => col.defaultTo(sql`now()`).primaryKey())
      .addColumn("all", "int2", col => col.unsigned().notNull())
      .addColumn("categories", "jsonb", col => col.notNull())
    .execute()
    
    await trx.schema.createTable("players").ifNotExists()
    .addColumn("id", "int8", col => col.autoIncrement().primaryKey())
    .addColumn("uuid", "uuid", col => col.notNull())
    .addColumn("join", "timestamptz", col => col.notNull())
    .addColumn("leave", "timestamptz")
    .addCheckConstraint("join before leave", sql`join < leave`)
    .execute()

    await trx.schema.createTable("version").ifNotExists()
      .addColumn("id", "int2", col => col.unique().notNull().check(sql`id = 1`))
    .addColumn("version", "varchar", col => col.notNull()).execute()
  
    await trx.insertInto("version").values({
      id: 1,
      version: "3.0.0"
    }).execute()
  }
});
