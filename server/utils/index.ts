import { sql } from "kysely";
import type { PoolConfig } from "pg";
import { type WebhookClientData } from "discord.js";
import { type Duration } from "date-fns";

export interface WebhookConfig {
  client: WebhookClientData;
  serverUrl: string;
  schedules: Record<
    string,
    { cron: string; range: Duration; message?: string }
  >;
}

export interface Config {
  dynmapLink: string;
  db: PoolConfig;
  categories?: Record<string, { uuids: string[]; colour: string }>;
  deleteOldCategories?: boolean;
  countsApproxMaxLength?: number;
  webhooks?: WebhookConfig;
}

export function useWebhookConfig(): WebhookConfig {
  const { webhooks } = useRuntimeConfig();
  return typeof webhooks === "string" ? JSON.parse(webhooks) : webhooks;
}

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
  console.log(`Found that \`${name}\` has UUID \`${uuid}\``);
  return uuid;
}
