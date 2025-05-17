import {db} from "../db";

async function currentPlayerList(): Promise<string[]> {
  const runtimeConfig = useRuntimeConfig();

  const res = await (await fetch(runtimeConfig.trackerConfig.dynmapLink)).json() as {players: {account: string}[]};
  const playerNames = res.players.map(a => a.account)
  return await Promise.all(playerNames.map(a => nameToUUID(a)))

export default defineTask({
  meta: {
    name: "updateCount",
  },
  run({payload, context}) {
    db.value += 1
    console.log(db.value)
    return {result: "success"}
  }
})