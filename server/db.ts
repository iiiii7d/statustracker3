import { Generated, Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";

export interface CountTable {
  timestamp: Generated<string>;
  all: number;
  [key: `cat_${string}`]: number;
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
    pool: new Pool(runtimeConfig.db),
  }),
});

db.transaction()
  // eslint-disable-next-line max-lines-per-function,max-statements
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
        .execute();

      await trx.schema
        .createTable("players")
        .ifNotExists()
        .addColumn("id", "bigserial", (col) => col.primaryKey())
        .addColumn("uuid", "uuid", (col) => col.notNull())
        .addColumn("join", "timestamptz", (col) => col.notNull())
        .addColumn("leave", "timestamptz", (col) =>
          col.check(sql`leave IS NULL OR "join" <= leave`),
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

    // new categories
    const currentTableNames = (
      await sql<{
        column_name: string;
      }>`SELECT column_name FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'counts'`.execute(
        trx,
      )
    ).rows
      .map((n) => n.column_name)
      .filter((n) => n.startsWith("cat_"))
      .map((n) => n.slice(4));
    const currentCategories = Object.keys(runtimeConfig.public.categories);

    const newTableNames = currentCategories.filter(
      (n) => !currentTableNames.includes(n),
    );
    await Promise.all(
      newTableNames.map(async (n) => {
        const catRef = sql.ref<string>(`cat_${n}`);
        await trx.schema
          .alterTable("counts")
          .addColumn(`cat_${n}`, "int2", (col) =>
            col.check(sql`${catRef} IS NULL OR ${catRef} >= 0`).defaultTo(null),
          )
          .execute();
      }),
    );

    if (runtimeConfig.deleteOldCategories) {
      const oldTableNames = currentTableNames.filter(
        (n) => !currentCategories.includes(n),
      );
      await Promise.all(
        oldTableNames.map(async (n) => {
          await trx.schema
            .alterTable("counts")
            .dropColumn(`cat_${n}`)
            .execute();
        }),
      );
    }
  })
  .then();
