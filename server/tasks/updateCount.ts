import { CountTable, db, PlayerTable } from "../db";
import { Insertable, Updateable } from "kysely";
import { Temporal } from "temporal-polyfill";

async function currentPlayerList(): Promise<string[]> {
  const runtimeConfig = useRuntimeConfig();

  const res = (await (
    await fetch(runtimeConfig.trackerConfig.dynmapLink)
  ).json()) as { players: { account: string }[] };
  const playerNames = res.players.map((a) => a.account);
  return await Promise.all(playerNames.map((a) => nameToUUID(a)));
}

function thisMinute(): Temporal.ZonedDateTime {
  return Temporal.Now.zonedDateTimeISO().round("minute");
}

function getCountEntry(playerList: string[]): Insertable<CountTable> {
  const runtimeConfig = useRuntimeConfig();

  return {
    timestamp: thisMinute(),
    all: playerList.length,
    categories: Object.fromEntries(
      (
        Object.entries(runtimeConfig.trackerConfig.categories) as [
          string,
          string[],
        ][]
      ).map(([cat, list]) => [
        cat,
        playerList.filter((a) => list.includes(a)).length,
      ]),
    ),
  };
}

export default defineTask({
  meta: {
    name: "updateCount",
  },
  async run() {
    const playerList = await currentPlayerList();

    await db.transaction().execute(async (trx) => {
      await trx
        .insertInto("counts")
        .values(getCountEntry(playerList))
        .execute();
      await Promise.all(
        playerList.map(async (player) => {
          const existing = await trx
            .selectFrom("players")
            .where("uuid", "=", player)
            .where("leave", "=", null)
            .executeTakeFirst();
          if (existing === undefined) {
            await trx
              .insertInto("players")
              .values({
                uuid: player,
                join: thisMinute(),
                leave: null,
              })
              .execute();
          }
        }),
      );
      await Promise.all(
        (
          await trx
            .selectFrom("players")
            .select("id")
            .where("leave", "=", null)
            .execute()
        ).map(async (result) => {
          await trx
            .updateTable("players")
            .set({ leave: thisMinute() })
            .where("id", "=", result.id)
            .execute();
        }),
      );
    });

    return { result: "success" };
  },
});
