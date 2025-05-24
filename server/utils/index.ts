import { sql } from "kysely";

export const currentTimestamp = sql<Date>`date_trunc('minute', now())`;
export const previousTimestamp = sql<Date>`date_trunc('minute', now() - INTERVAL '1 minute')`;

const cache = new Map<string, string | null>();

export async function nameToUUID(name: string): Promise<string | null> {
  const c = cache.get(name);
  if (c !== undefined) return c;

  const res = await fetch(
    `https://api.mojang.com/users/profiles/minecraft/${name}`,
  );
  const uuid = res.status === 404 ? null : (await res.json()).id;
  cache.set(name, uuid);
  logger.verbose(`Found that \`${name}\` has UUID \`${uuid}\``);
  return uuid;
}
