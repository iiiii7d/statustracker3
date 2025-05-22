import { Database, db } from "~/server/db";
import { Temporal } from "temporal-polyfill";
import { z } from "zod/v4";
import { sql } from "kysely";

const schema = z.object({
  from: z.string(),
  to: z.string().optional(),
  movingAverage: z.preprocess(
    (a) => (typeof a === "string" ? parseInt(a) : a),
    z.int().gte(0).default(0),
  ),
});

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig();
  const query = await getValidatedQuery(event, (body) => schema.parse(body));
  const from = Temporal.ZonedDateTime.from(query.from);
  const to =
    query.to === undefined
      ? Temporal.Now.zonedDateTimeISO().add({ minutes: 1 })
      : Temporal.ZonedDateTime.from(query.to);
  if (Temporal.ZonedDateTime.compare(from, to) === 1) {
    throw createError({
      statusCode: 400,
      statusMessage: "`to` is earlier than `from`, switch it around",
    });
  }

  const ma = `${query.movingAverage} hours`;

  return await db
    .selectFrom("counts")
    .select("timestamp")
    .select(
      query.movingAverage === 0
        ? "all"
        : (sql<number>`(AVG("all") OVER (ORDER BY timestamp RANGE BETWEEN ${ma} PRECEDING AND ${ma} FOLLOWING))::real`.as(
            "all",
          ) as never),
    )
    .select(
      Object.keys(runtimeConfig.public.categories).map((n) => {
        if (query.movingAverage === 0) {
          return `cat_${n}`;
        }
        const catRef = sql.ref(`cat_${n}`);
        return sql<number>`(AVG(${catRef}) OVER (ORDER BY timestamp RANGE BETWEEN ${ma} PRECEDING AND ${ma} FOLLOWING))::real`.as(
          `cat_${n}`,
        );
      }) as never,
    )
    .where((eb) =>
      eb.between("timestamp", temporalToString(from), temporalToString(to)),
    )
    .orderBy("timestamp", "asc")
    .execute();
});
