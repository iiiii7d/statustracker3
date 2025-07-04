import { AttachmentBuilder } from "discord.js";
import * as df from "date-fns";
import { CronExpressionParser } from "cron-parser";
import puppeteer from "puppeteer";
import { getDB } from "~~/server/db";

export default defineTask({
  meta: {
    name: "webhooks",
  },
  // eslint-disable-next-line max-lines-per-function
  async run() {
    const webhookConfig = config.webhooks;
    const db = await getDB();
    if (webhookConfig === undefined) return { result: "success" };

    await Promise.all(
      Object.entries(webhookConfig.schedules).map(
        // eslint-disable-next-line max-lines-per-function,max-statements
        async ([id, { cron, range, message }]) => {
          const interval = CronExpressionParser.parse(cron);
          const nextUpdate = (
            await db
              .selectFrom("webhooks")
              .select("nextUpdate")
              .where("id", "=", id)
              .executeTakeFirst()
          )?.nextUpdate;

          if (
            nextUpdate !== undefined &&
            df.compareAsc(new Date(), nextUpdate) >= 0
          ) {
            logger.info(`Running webhook \`${id}\``);
            const from = df.sub(new Date(), range);
            const to = new Date();

            const browser = await puppeteer.launch({
              ...(process.env.DOCKER
                ? {
                    headless: true,
                    executablePath: "/usr/bin/google-chrome",
                    args: ["--no-sandbox"],
                  }
                : {}),
              ...(webhookConfig.puppeteer ?? {}),
            });
            try {
              const page = await browser.newPage();
              await page.emulateTimezone(webhookConfig.puppeteer?.timezone);
              await page.goto(webhookConfig.serverUrl);
              await page.setViewport({ width: 1920, height: 1080 });

              const inputFrom = df.formatISO(from).replace(/(?:Z|\+.*)$/u, "");
              await page.locator("input#from").fill(inputFrom);
              await page.locator("button#query").click();
              for (let i = 0; i < 15; i += 1) {
                // eslint-disable-next-line no-await-in-loop
                if ((await page.$("span#player-stats")) === null) break;
                // eslint-disable-next-line no-await-in-loop
                await new Promise((r) => {
                  setTimeout(r, 1000);
                });
              }

              const handle1 = (await page.waitForSelector("canvas"))!;
              const screenshot1 = await handle1.screenshot();
              const attachment1 = new AttachmentBuilder(
                Buffer.from(screenshot1),
              );

              const handle2 = (await page.waitForSelector("#statistics"))!;
              const screenshot2 = await handle2.screenshot();
              const attachment2 = new AttachmentBuilder(
                Buffer.from(screenshot2),
              );

              await webhookConfig.client.send({
                content: message
                  .replaceAll(
                    "%url%",
                    `${webhookConfig.serverUrl}?from=${from.toISOString()}&to=${to.toISOString()}`,
                  )
                  .replaceAll("%id%", id)
                  .replaceAll("%range%", df.formatDuration(range))
                  .replaceAll(
                    "%from%",
                    Math.round(from.getTime() / 1000).toString(),
                  )
                  .replaceAll(
                    "%to%",
                    Math.round(to.getTime() / 1000).toString(),
                  ),
                files: [attachment1, attachment2],
              });
              logger.info(`Webhook run \`${id}\` successful`);
            } finally {
              await browser.close();
            }
          }

          const newNextUpdate = interval.next().toDate();
          logger.info(`Webhook \`${id}\` will run again at ${newNextUpdate}`);
          if (nextUpdate === undefined) {
            await db
              .insertInto("webhooks")
              .values({ id, nextUpdate: newNextUpdate })
              .execute();
          } else {
            await db
              .updateTable("webhooks")
              .set({ nextUpdate: newNextUpdate })
              .where("id", "=", id)
              .execute();
          }
        },
      ),
    );
    return { result: "success" };
  },
});
