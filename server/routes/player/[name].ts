import { db } from "~/server/db";
import { Temporal } from "temporal-polyfill";
import { z } from "zod/v4";

const schema = z.object({
  from: z.iso.datetime({ offset: true, local: false }),
  to: z.iso.datetime({ offset: true, local: false }),
});

export default defineEventHandler(async (event) => {
  const player = getRouterParam(event, "name")!;

  const query = await getValidatedQuery(event, (body) => schema.parse(body));
  const from = Temporal.ZonedDateTime.from(query.from);
  const to = Temporal.ZonedDateTime.from(query.to);
  if (to < from) {
    throw createError({
      statusCode: 400,
      statusMessage: "`to` is earlier than `from`, switch it around",
    });
  }

  return await db
    .selectFrom("players")
    .select(["join", "leave"])
    .where((eb) =>
      eb.or([eb.between("join", from, to), eb.between("leave", from, to)]),
    )
    .where("uuid", "=", await nameToUUID(player))
    .orderBy("join", "asc")
    .execute();
});
