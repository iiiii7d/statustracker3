import { db } from "~/server/db";
import { Temporal } from "temporal-polyfill";
import { z } from "zod/v4";
import { sql } from "kysely";

const schema = z.object({
  from: z.string(),
  to: z.string().optional(),
});

// eslint-disable-next-line max-lines-per-function,max-statements
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
  const uuid = await nameToUUID(player);

  const playTimesP = await db
    .selectFrom("players")
    .select(["join", "leave"])
    .where((eb) =>
      eb.or([
        eb.between("join", temporalToString(from), temporalToString(to)),
        eb.between("leave", temporalToString(from), temporalToString(to)),
      ]),
    )
    .where("uuid", "=", uuid)
    .orderBy("join", "asc")
    .execute();

  const playDurationP = db
    .with("ft", (qc) =>
      qc
        .selectFrom("players")
        .select((eb) =>
          eb
            .case()
            .when("leave", "is", null)
            .then(currentTimestamp)
            .when("leave", ">", currentTimestamp)
            .then(currentTimestamp)
            .when("leave", ">", temporalToString(to))
            .then(temporalToString(to))
            .else(sql.ref("leave"))
            .end()
            .as("leave"),
        )
        .select((eb) =>
          eb
            .case()
            .when("join", "<", temporalToString(from))
            .then(temporalToString(from))
            .else(sql.ref("join"))
            .end()
            .as("join"),
        )
        .where("uuid", "=", uuid),
    )
    .selectFrom("ft")
    .select(
      sql`(EXTRACT(EPOCH FROM SUM(ft.leave - ft."join"))/60)::int`.as(
        "playDuration",
      ),
    )
    .executeTakeFirstOrThrow();
  const [playTimes, { playDuration }] = await Promise.all([
    playTimesP,
    playDurationP,
  ]);

  return {
    playTimes,
    playDuration,
  };
});
