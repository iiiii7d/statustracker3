import { db } from "~/server/db";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";

const schema = z.object({
  from: z.string().datetime({ offset: true, local: false }),
  to: z.string().datetime({ offset: true, local: false }),
  category: z.string().optional(),
  movingAverage: z.number().gte(0).default(0),
});

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, (body) => schema.parse(body));
  const from = Temporal.ZonedDateTime.from(query.from);
  const to = Temporal.ZonedDateTime.from(query.to);

  return await db
    .selectFrom("counts")
    .select(
      (query.category === undefined
        ? "all"
        : `categories->${query.category}`) as never,
    )
    .where((eb) => eb.between("timestamp", from, to))
    .orderBy("timestamp", "asc")
    .execute();
});
