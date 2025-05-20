import { db } from "~/server/db";
import { Temporal } from "temporal-polyfill";
import { z } from "zod/v4";

const schema = z.object({
  from: z.iso.datetime({ offset: true, local: false }),
  to: z.iso.datetime({ offset: true, local: false }),
  category: z.string().optional(),
  movingAverage: z.number().gte(0).default(0),
});

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig();
  const query = await getValidatedQuery(event, (body) => schema.parse(body));
  const from = Temporal.ZonedDateTime.from(query.from);
  const to = Temporal.ZonedDateTime.from(query.to);
  if (to < from) {
    throw createError({
      statusCode: 400,
      statusMessage: "`to` is earlier than `from`, switch it around",
    });
  }
  if (
    query.category !== undefined &&
    !Object.keys(runtimeConfig.trackerConfig.categories).includes(
      query.category,
    )
  ) {
    throw createError({ statusCode: 400, statusMessage: "invalid category" });
  }

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
