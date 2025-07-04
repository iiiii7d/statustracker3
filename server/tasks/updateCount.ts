import { Database, getDB } from "../db";
import { sql, Transaction } from "kysely";

async function currentPlayerList(): Promise<string[]> {
  logger.info(`Retrieving current player list from ${config.dynmapLink}`);

  const res = await fetch(config.dynmapLink);
  if (res.status !== 200)
    throw Error(
      `${config.dynmapLink} returned ${res.status}:\n${await res.text()}`,
    );
  const json = (await res.json()) as {
    players: { account: string }[];
  };
  const playerNames = json.players.map((a) => a.account);
  const playerUuids = (
    await Promise.all(playerNames.map((a) => nameToUUID(a)))
  ).filter((a) => a !== null);
  logger.info("Retrieval of current player list successful");
  return playerUuids;
}

async function updateCounts(trx: Transaction<Database>, playerList: string[]) {
  logger.info("Updating `counts` table");
  await trx
    .insertInto("counts")
    .values({
      timestamp: currentTimestamp,
      all: playerList.length,
      ...Object.fromEntries(
        Object.entries(config.categories).map(([cat, { uuids }]) => [
          `cat_${cat}`,
          playerList.filter((a) => uuids.includes(a)).length,
        ]),
      ),
    })
    .execute();
}

async function updatePlayersJoin(
  trx: Transaction<Database>,
  playerList: string[],
) {
  logger.info("Updating `players` table for joined players");
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
            join: currentTimestamp,
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
  logger.info("Updating `players` table for left players");
  let cmd = trx
    .updateTable("players")
    .set({ leave: currentTimestamp })
    .where("leave", "is", null);
  if (playerList.length) cmd = cmd.where("uuid", "not in", playerList);

  await cmd.execute();
}

async function closePlayerEntriesIfPaused(trx: Transaction<Database>) {
  if (
    (await trx
      .selectFrom("counts")
      .where("timestamp", "=", previousTimestamp)
      .executeTakeFirst()) !== undefined
  )
    return;

  logger.info("Server was paused. Completing last player entries");
  const lastTimestamp = (
    await trx
      .selectFrom("counts")
      .select("timestamp")
      .orderBy("timestamp", "desc")
      .where("timestamp", "!=", currentTimestamp)
      .executeTakeFirst()
  )?.timestamp;

  if (lastTimestamp === undefined) return;

  await trx
    .updateTable("players")
    .where("leave", "is", null)
    .set({
      leave: sql`${lastTimestamp}::timestamptz + INTERVAL '1 min'`,
    })
    .execute();
}

export default defineTask({
  meta: {
    name: "updateCount",
  },
  async run() {
    const playerList = await currentPlayerList();

    await (await getDB()).transaction().execute(async (trx) => {
      await updateCounts(trx, playerList);

      await closePlayerEntriesIfPaused(trx);

      await updatePlayersJoin(trx, playerList);
      await updatePlayersLeave(trx, playerList);
    });

    return { result: "success" };
  },
});
