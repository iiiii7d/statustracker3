import { z } from "zod/v4";
import { WebhookClientData } from "discord.js";
import { PoolConfig } from "pg";
import { Duration } from "date-fns";
import * as fs from "node:fs";
import logger from "./logger";

const webhookConfigSchema = z.object({
  client: z.custom<WebhookClientData>(),
  serverUrl: z.string(),
  schedules: z.record(
    z.string(),
    z.object({
      cron: z.string(),
      range: z.custom<Duration>(),
      message: z.string().optional(),
    }),
  ),
});
const configSchema = z.object({
  dynmapLink: z.url(),
  db: z.custom<PoolConfig>(),
  categories: z
    .record(
      z.string(),
      z.object({
        uuids: z.uuid().array(),
        colour: z.regex(/^#(?:[0-9a-f]{3}){1,2}$/u),
      }),
    )
    .default({}),
  deleteOldCategories: z.boolean().default(false),
  countsApproxMaxLength: z.int().gte(1).default(1000),
  webhooks: webhookConfigSchema.optional(),
});

export type Config = z.infer<typeof configSchema>;
export type WebhookConfig = z.infer<typeof webhookConfigSchema>;

// eslint-disable-next-line max-statements
export function getConfig(): Config {
  if (process.env.NUXT_CONFIG) {
    logger.info("Using config found in `NUXT_CONFIG`");
    const config = configSchema.parse(JSON.parse(process.env.NUXT_CONFIG));
    process.env.NUXT_CONFIG = JSON.stringify(config);
    return config;
  }
  const configPath = process.env.CONFIG_PATH ?? "config.json";
  if (fs.existsSync(configPath)) {
    logger.info(`Using config found in \`${configPath}\``);
    return configSchema.parse(
      JSON.parse(fs.readFileSync(configPath).toString()),
    );
  } else if (!process.env.CONFIG_PATH) {
    logger.info("Using default config");
    return configSchema.parse({
      dynmapLink:
        "https://api.allorigins.win/raw?url=https%3A//dynmap.minecartrapidtransit.net/main/standalone/dynmap_new.json",
      db: {
        database: "statustracker3",
        host: "localhost",
        user: "user",
        port: 5432,
      },
    });
  }
  throw Error(`Could not find config at ${configPath}`);
}

export function useConfig(): Config {
  const { config } = useRuntimeConfig();
  return typeof config === "string" ? JSON.parse(config) : config;
}
