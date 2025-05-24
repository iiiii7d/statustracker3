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
});

// eslint-disable-next-line max-lines-per-function,max-statements
export default defineEventHandler(async (event) => {
  logger.verbose(`Processing ${event.path}`);
  const player = getRouterParam(event, "name")!;

  const { from, to } = await getValidatedQuery(event, (body) =>
    schema.parse(body),
  );
  if (df.compareAsc(from, to) === 1) {
    throw createError({
      statusCode: 400,
      message: "`to` is earlier than `from`",
    });
  }
  const uuid = await nameToUUID(player);
  if (uuid === null) {
    throw createError({
      statusCode: 404,
      message: `no UUID for ${player}`,
    });
  }

  const playTimesP = await db
    .selectFrom("players")
    .select(["join", "leave"])
    .where((eb) =>
      eb.or([eb.between("join", from, to), eb.between("leave", from, to)]),
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
            .when("leave", ">", to)
            .then(to)
            .else(sql.ref("leave"))
            .end()
            .as("leave"),
        )
        .select((eb) =>
          eb
            .case()
            .when("join", "<", from)
            .then(from)
            .else(sql.ref("join"))
            .end()
            .as("join"),
        )
        .where("uuid", "=", uuid)
        .where((eb) =>
          eb.or([eb.between("join", from, to), eb.between("leave", from, to)]),
        ),
    )
    .selectFrom("ft")
    .select(
      sql<number>`(EXTRACT(EPOCH FROM SUM(ft.leave - ft."join"))/60)::int`.as(
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
