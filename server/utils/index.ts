import { PoolConfig } from "pg";

const cache = new Map<string, string>();

export interface Config {
  categories: Record<string, string[]>;
  dynmapLink: string;
  db: PoolConfig;
}

export async function nameToUUID(name: string): Promise<string> {
  const c = cache.get(name);
  if (c !== undefined) return c;

  const res = await fetch(
    `https://api.mojang.com/users/profiles/minecraft/${name}`,
  );
  if (res.status === 400) throw Error(`${name} is invalid: ${res.statusText}`);
  const uuid = (await res.json()).id;
  cache.set(name, uuid);
  return uuid;
}
