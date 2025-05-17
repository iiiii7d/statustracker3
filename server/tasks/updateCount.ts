import {CountTable, db, PlayerTable} from "../db";
import {Insertable, Updateable} from "kysely";
import {Temporal} from "temporal-polyfill";

async function currentPlayerList(): Promise<string[]> {
  const runtimeConfig = useRuntimeConfig();

  const res = await (await fetch(runtimeConfig.trackerConfig.dynmapLink)).json() as {players: {account: string}[]};
  const playerNames = res.players.map(a => a.account)
  return await Promise.all(playerNames.map(a => nameToUUID(a)))
}

function thisMinute(): Temporal.ZonedDateTime {
  return Temporal.Now.zonedDateTimeISO().round("minute");
}

function getCountEntry(playerList: string[]): Insertable<CountTable> {
  const runtimeConfig = useRuntimeConfig();

  return {
    timestamp: thisMinute(),
    all: playerList.length,
    categories: Object.fromEntries((Object.entries(runtimeConfig.trackerConfig.categories) as [string, string[]][]).map(([cat, list]) => {
      return [cat, playerList.filter(a => list.includes(a)).length]
    }))
  }
}

export default defineTask({
  meta: {
    name: "updateCount",
  },
  async run() {
    const playerList = await currentPlayerList();
    await db.insertInto("counts")
      .values(getCountEntry(playerList))
      .execute();
    // TODO: find previous entry, and do updates from it

    return {result: "success"}
  }
})