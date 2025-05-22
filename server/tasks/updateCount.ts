import { Database, db } from "../db";
import { Transaction } from "kysely";
import { Temporal } from "temporal-polyfill";

async function currentPlayerList(): Promise<string[]> {
  const runtimeConfig = useRuntimeConfig();
  console.log(
    `Retrieving current player list from ${runtimeConfig.trackerConfig.dynmapLink}`,
  );

  const res = (await (
    await fetch(runtimeConfig.trackerConfig.dynmapLink)
  ).json()) as { players: { account: string }[] };
  const playerNames = res.players.map((a) => a.account);
  const playerUuids = await Promise.all(playerNames.map((a) => nameToUUID(a)));
  console.log("Retrieval of current player list successful");
  return playerUuids;
}

function currentTimestamp(): string {
  return temporalToString(Temporal.Now.zonedDateTimeISO().round("minute"));
}

async function updateCounts(trx: Transaction<Database>, playerList: string[]) {
  const runtimeConfig = useRuntimeConfig();

  console.log("Updating `counts` table");
  await trx
    .insertInto("counts")
    .values({
      timestamp: currentTimestamp(),
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
    })
    .execute();
}

async function updatePlayersJoin(
  trx: Transaction<Database>,
  playerList: string[],
) {
  console.log("Updating `players` table for joined players");
  await Promise.all(
    playerList.map(async (player) => {
      const existing = await trx
        .selectFrom("players")
        .where("uuid", "=", player)
        .where("leave", "is", null)
        .executeTakeFirst();
      if (existing === undefined) {
        await trx
          .insertInto("players")
          .values({
            uuid: player,
            join: currentTimestamp(),
            leave: null,
          })
          .execute();
      }
    }),
  );
}

async function updatePlayersLeave(
  trx: Transaction<Database>,
  playerList: string[],
) {
  console.log("Updating `players` table for left players");
  await Promise.all(
    (
      await trx
        .selectFrom("players")
        .select("id")
        .where("leave", "is", null)
        .where("uuid", "not in", playerList)
        .execute()
    ).map(async (result) => {
      await trx
        .updateTable("players")
        .set({ leave: currentTimestamp() })
        .where("id", "=", result.id)
        .execute();
    }),
  );
}

export default defineTask({
  meta: {
    name: "updateCount",
  },
  async run() {
    const playerList = await currentPlayerList();

    await db.transaction().execute(async (trx) => {
      await updateCounts(trx, playerList);

      await updatePlayersJoin(trx, playerList);
      await updatePlayersLeave(trx, playerList);
    });

    return { result: "success" };
  },
});
