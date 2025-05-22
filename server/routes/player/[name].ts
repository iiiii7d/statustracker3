import { db } from "~/server/db";
import { Temporal } from "temporal-polyfill";
import { z } from "zod/v4";

const schema = z.object({
  from: z.string(),
  to: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const player = getRouterParam(event, "name")!;

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

  return await db
    .selectFrom("players")
    .select(["join", "leave"])
    .where((eb) =>
      eb.or([
        eb.between("join", temporalToString(from), temporalToString(to)),
        eb.between("leave", temporalToString(from), temporalToString(to)),
      ]),
    )
    .where("uuid", "=", await nameToUUID(player))
    .orderBy("join", "asc")
    .execute();
});
