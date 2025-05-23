import { db } from "~/server/db";
import { z } from "zod/v4";
import { sql } from "kysely";
import * as df from "date-fns";

const schema = z.object({
  from: z.iso
    .datetime({ local: false, offset: true })
    .transform((a) => df.parseISO(a)),
  to: z.iso
    .datetime({ local: false, offset: true })
    .transform((a) => df.parseISO(a))
    .default(new Date()),
  movingAverage: z.preprocess(
    (a) => (typeof a === "string" ? parseInt(a) : a),
    z.int().gte(0).default(0),
  ),
});

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig();
  const { from, to, movingAverage } = await getValidatedQuery(event, (body) =>
    schema.parse(body),
  );
  if (df.compareAsc(from, to) === 1) {
    throw createError({
      statusCode: 400,
      message: "`to` is earlier than `from`",
    });
  }

  const ma = `${movingAverage} hours`;

  return await db
    .selectFrom("counts")
    .select("timestamp")
    .select(
      movingAverage === 0
        ? "all"
        : (sql<number>`(AVG("all") OVER (ORDER BY timestamp RANGE BETWEEN ${ma} PRECEDING AND ${ma} FOLLOWING))::real`.as(
            "all",
          ) as never),
    )
    .select(
      Object.keys(runtimeConfig.public.categories).map((n) => {
        if (movingAverage === 0) {
          return `cat_${n}`;
        }
        const catRef = sql.ref(`cat_${n}`);
        return sql<number>`(AVG(${catRef}) OVER (ORDER BY timestamp RANGE BETWEEN ${ma} PRECEDING AND ${ma} FOLLOWING))::real`.as(
          `cat_${n}`,
        );
      }) as never,
    )
    .where((eb) => eb.between("timestamp", from, to))
    .orderBy("timestamp", "asc")
    .execute();
});
