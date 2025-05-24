import { CountTable, db } from "~/server/db";
import { z } from "zod/v4";
import { Selectable, sql } from "kysely";
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

// eslint-disable-next-line max-lines-per-function
export default defineEventHandler(async (event) => {
  logger.info(`Processing ${event.path}`);

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

  return (await db
    .with("temp", (qc) =>
      qc
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
          Object.keys(config.categories).map((n) => {
            if (movingAverage === 0) {
              return `cat_${n}`;
            }
            const catRef = sql.ref(`cat_${n}`);
            return sql<number>`(AVG(${catRef}) OVER (ORDER BY timestamp RANGE BETWEEN ${ma} PRECEDING AND ${ma} FOLLOWING))::real`.as(
              `cat_${n}`,
            );
          }) as never,
        )
        .select([
          (eb) => eb.fn.countAll().over().as("count"),
          sql<number>`ROW_NUMBER() OVER (ORDER BY timestamp)`.as("row_n"),
        ])
        .where((eb) => eb.between("timestamp", from, to))
        .orderBy("timestamp", "asc"),
    )
    .selectFrom("temp")
    .select([
      "timestamp",
      "all",
      ...Object.keys(config.categories).map((n) => `cat_${n}`),
    ])
    .where(
      sql<boolean>`count <= ${config.countsApproxMaxLength} OR MOD(row_n, (count/${config.countsApproxMaxLength})) = 0`,
    )
    .execute()) as Selectable<CountTable>[];
});
