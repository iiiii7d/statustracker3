import { z } from "zod/v4";
import { WebhookClient, WebhookClientData } from "discord.js";
import { Pool, PoolConfig } from "pg";
import { Duration } from "date-fns";
import * as fs from "node:fs";
import logger from "./logger";

const webhookConfigSchema = z.object({
  client: z.custom<WebhookClientData>().transform((a) => new WebhookClient(a)),
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
  db: z.custom<PoolConfig>().transform((a) => new Pool(a)),
  categories: z
    .record(
      z.string(),
      z.object({
        uuids: z.guid().array(),
        colour: z.string().regex(/^#(?:[0-9a-f]{3}){1,2}$/u),
      }),
    )
    .default({}),
  webhooks: webhookConfigSchema.optional(),
  deleteOldCategories: z.boolean().default(false),
  countsApproxMaxLength: z.int().gte(1).default(1000),
});

export type Config = z.infer<typeof configSchema>;

// eslint-disable-next-line max-statements,consistent-return
export function getConfig(): Config {
  if (process.env.CONFIG) {
    logger.info("Using config found in `CONFIG`");
    return configSchema.parse(JSON.parse(process.env.CONFIG));
  }

  const configPath = process.env.CONFIG_PATH ?? "config.json";
  if (fs.existsSync(configPath)) {
    logger.info(`Using config found in \`${configPath}\``);
    return configSchema.parse(
      JSON.parse(fs.readFileSync(configPath).toString()),
    );
  }

  logger.error(`Could not find config at ${configPath}`);
  process.exit(1);
}
export const config = getConfig();
