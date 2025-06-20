import { Generated, Kysely, PostgresDialect, sql } from "kysely";
import { types as pgTypes } from "pg";
import * as df from "date-fns";

export interface CountTable {
  timestamp: Generated<Date>;
  all: number;
  [key: `cat_${string}`]: number;
}

export interface PlayerTable {
  id: Generated<number>;
  uuid: string;
  join: Date;
  leave: Date | null;
}

export interface VersionTable {
  id: 1;
  version: string;
}

export interface WebhooksTable {
  id: string;
  nextUpdate: Date;
}

export interface Database {
  counts: CountTable;
  players: PlayerTable;
  version: VersionTable;
  webhooks: WebhooksTable;
}

pgTypes.setTypeParser(pgTypes.builtins.TIMESTAMPTZ, (val) => df.parseISO(val));

const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: config.db,
  }),
});
let dbReady = false;

export async function getDB(): Promise<Kysely<Database>> {
  // eslint-disable-next-line no-unmodified-loop-condition
  while (!dbReady) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => {
      setTimeout(r, 0);
    });
  }
  return db;
}

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
      logger.info("Runnning migrations for v3.0.0");
      await trx.schema
        .createTable("counts")
        .ifNotExists()
        .addColumn("timestamp", "timestamptz", (col) =>
          col.defaultTo(currentTimestamp).primaryKey(),
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

      await trx.schema
        .createTable("webhooks")
        .ifNotExists()
        .addColumn("id", "varchar", (col) => col.primaryKey())
        .addColumn("nextUpdate", "timestamptz", (col) => col.notNull())
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
    const currentCategories = Object.keys(config.categories);

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

    if (config.deleteOldCategories) {
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

    // delete old webhook schedules
    if (config.webhooks !== undefined) {
      await trx
        .deleteFrom("webhooks")
        .where("id", "not in", Object.keys(config.webhooks.schedules))
        .execute();
    }
  })
  .then(() => {
    dbReady = true;
  });
