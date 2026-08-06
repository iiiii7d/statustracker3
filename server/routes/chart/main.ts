import * as echarts from "echarts";
import { getMainChartOption, getSeries } from "#shared/mainChart.ts";
import { getCounts } from "#server/routes/counts.ts";
import * as dt from "@internationalized/date";
import now from "#shared/now.ts";
import { z } from "zod/v4";

const schema = z
  .object({
    from: z.iso
      .datetime({ local: false, offset: true })
      .transform((s) => dt.parseAbsoluteToLocal(s)),
    to: z.iso
      .datetime({ local: false, offset: true })
      .transform((s) => dt.parseAbsoluteToLocal(s))
      .default(now().add({ minutes: 1 })),
    movingAverage: z.preprocess(
      (a) => (typeof a === "string" ? parseInt(a) : a),
      z.int().gte(0).default(0),
    ),
  })
  .refine(
    ({ from: f, to: t }) =>
      !(f instanceof dt.ZonedDateTime) ||
      !(t instanceof dt.ZonedDateTime) ||
      f.compare(t) < 0,
    { error: "`to` is earlier than `from`" },
  );

export default defineEventHandler(async (event): Promise<string> => {
  logger.verbose(`Processing ${event.path}`);

  const { from, to, movingAverage } = await getValidatedQuery(event, (body) =>
    schema.parse(body),
  );

  const chart = echarts.init(null, null, {
    renderer: "svg",
    ssr: true,
    width: 1920,
    height: 1080,
  });

  const counts = await getCounts(from, to, movingAverage);
  const series = getSeries(
    // @ts-ignore
    new Map([[movingAverage, counts]]),
    config.categories,
  );
  const option = getMainChartOption(series);
  chart.setOption({ ...option, backgroundColor: "#111" });
  const str = chart.renderToSVGString();
  chart.dispose();
  return str;
});
