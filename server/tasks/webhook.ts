import { AttachmentBuilder } from "discord.js";
import puppeteer from "puppeteer";
import { now } from "#server/utils";
import config from "#server/utils/config";

// eslint-disable-next-line max-lines-per-function,max-statements
export default async function webhook(id: string) {
  const webhookConfig = config.webhooks;
  if (webhookConfig === undefined) return { result: "success" };
  const { message, range } = webhookConfig.schedules[id]!;

  logger.info(`Running webhook \`${id}\``);
  const from = now().subtract(range);
  const to = now();

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

    const inputFrom = from.toAbsoluteString().replace(/(?:Z|\+.*)$/u, "");
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
    const attachment1 = new AttachmentBuilder(Buffer.from(screenshot1));

    const handle2 = (await page.waitForSelector("#statistics"))!;
    const screenshot2 = await handle2.screenshot();
    const attachment2 = new AttachmentBuilder(Buffer.from(screenshot2));

    await webhookConfig.client.send({
      content: message
        .replaceAll(
          "%url%",
          `${webhookConfig.serverUrl}?from=${from.toAbsoluteString()}&to=${to.toAbsoluteString()}`,
        )
        .replaceAll("%id%", id)
        .replaceAll("%range%", `${range}`)
        .replaceAll(
          "%from%",
          Math.round(from.toDate().getTime() / 1000).toString(),
        )
        .replaceAll(
          "%to%",
          Math.round(to.toDate().getTime() / 1000).toString(),
        ),
      files: [attachment1, attachment2],
    });
    logger.success(`Webhook run \`${id}\` successful`);
  } finally {
    await browser.close();
  }

  return { result: "success" };
}
