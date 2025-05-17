import {Temporal} from "temporal-polyfill";
import {Generated, Kysely, PostgresDialect} from "kysely";
import {types as pgTypes, Pool} from "pg";


export interface CountTable {
  timestamp: Generated<Temporal.ZonedDateTime>,
  all: number,
  categories: Record<string, number>,
}

export interface PlayerTable {
  uuid: string,
  join: Temporal.ZonedDateTime,
  left: Temporal.ZonedDateTime | null
}

export interface Database {
  counts: CountTable,
  players: PlayerTable
}

pgTypes.setTypeParser(pgTypes.builtins.TIMESTAMPTZ, (val) => {
  return Temporal.ZonedDateTime.from(val)
})

const runtimeConfig = useRuntimeConfig();
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool(runtimeConfig.trackerConfig.db)
  })
})