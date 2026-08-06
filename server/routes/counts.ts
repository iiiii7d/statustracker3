import { getDB } from "#server/db";
import { z } from "zod/v4";
import { sql } from "kysely";
import * as dt from "@internationalized/date";
import now from "#shared/now";
import { type CountsAPI, countsAPI, type CountsAPIJson } from "#shared/api.ts";

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

export default defineEventHandler(async (event): Promise<CountsAPIJson> => {
  logger.verbose(`Processing ${event.path}`);
  const db = await getDB();

  const { from, to, movingAverage } = await getValidatedQuery(event, (body) =>
    schema.parse(body),
  );

  const ma = `${movingAverage} hours`;

  const result = (await db
    .with("moving_avgs", (qc) =>
      qc
        .selectFrom("counts")
        .select(["timestamp", "category"])
        .select(
          movingAverage === 0
            ? "value"
            : sql<number>`(AVG(value) OVER (PARTITION BY category ORDER BY timestamp RANGE BETWEEN ${ma} PRECEDING AND ${ma} FOLLOWING))::real`.as(
                "value",
              ),
        ),
    )
    .with("aggregation", (qc) =>
      qc
        .selectFrom("moving_avgs")
        .select("timestamp")
        .select((eb) =>
          eb.fn.agg("json_object_agg", ["category", "value"]).as("values"),
        )
        .select((eb) => eb.fn.countAll().over().as("count"))
        .select((eb) =>
          eb.fn
            .agg("row_number")
            .over((ob) => ob.orderBy("timestamp"))
            .as("row_n"),
        )
        .groupBy("timestamp")
        .having((eb) => eb.between("timestamp", from, to)),
    )
    .selectFrom("aggregation")
    .select(["timestamp", "values"])
    .where(
      sql<boolean>`"count" <= ${config.countsApproxMaxLength} OR MOD(row_n, ("count"/${config.countsApproxMaxLength})) = 0`,
    )
    .orderBy("timestamp", "asc")
    .execute()) as CountsAPI;
  return countsAPI.ser(result);
});
