import { db } from "~/server/db";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";

const schema = z.object({
  from: z.string().datetime({ offset: true, local: false }),
  to: z.string().datetime({ offset: true, local: false }),
});

export default defineEventHandler(async (event) => {
  const player = getRouterParam(event, "name")!;

  const query = await getValidatedQuery(event, (body) => schema.parse(body));
  const from = Temporal.ZonedDateTime.from(query.from);
  const to = Temporal.ZonedDateTime.from(query.to);

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
