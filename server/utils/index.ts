const cache = new Map<string, string>();

export type Config = {
  categories: Record<string, string[]>,
  dynmapLink: string,
  dbUri: string,
}

export async function nameToUUID(name: string): Promise<string> {
  const c = cache.get(name);
  if (c !== undefined) return c;

  const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${name}`);
  if (res.status === 400) throw Error(`${name} is invalid: ${res.statusText}`);
  const uuid = (await res.json()).id
  cache.set(name, uuid);
  return uuid
}