import { db } from "~/server/db";
import { Temporal } from "temporal-polyfill";
import { z } from "zod/v4";

const schema = z.object({
  from: z.string(),
  to: z.string().optional(),
  category: z.string().optional(),
  movingAverage: z.number().gte(0).default(0),
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
    .where((eb) =>
      eb.between("timestamp", temporalToString(from), temporalToString(to)),
    )
    .orderBy("timestamp", "asc")
    .execute();
});
