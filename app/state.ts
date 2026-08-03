import {
  countsAPI,
  type CountsAPI,
  playerAPI,
  type PlayerAPI,
} from "#shared/api.ts";
import { FetchError } from "ofetch";
import type * as dt from "@internationalized/date";

export const loading = ref(0);
export const wrapLoading =
  <T>(f: () => T): (() => T) =>
  () => {
    loading.value += 1;
    const result = f();
    loading.value -= 1;
    return result;
  };

export const from = shallowRef<dt.ZonedDateTime | undefined>();
export const to = shallowRef<dt.ZonedDateTime | undefined>();
export const dateInvalid = computed(
  () => !from.value || !to.value || from.value.compare(to.value) >= 0,
);

export const shownMovingAverages = reactive<Record<MovingAverage, boolean>>({
  0: true,
  1: true,
  12: false,
  24: false,
  168: false,
});

export const counts = ref(new Map<MovingAverage, CountsAPI>());
watch(
  [from, to, shownMovingAverages],
  wrapLoading(async () => {
    if (dateInvalid.value) return;
    counts.value = new Map<MovingAverage, CountsAPI>(
      await Promise.all(
        Object.entries(shownMovingAverages)
          .filter(([ma, a]) => ma === "0" || a)
          .map(async ([ma2]) => {
            const ma = parseInt(ma2) as MovingAverage;
            const data = await $fetch("/counts", {
              query: {
                from: from.value!.toAbsoluteString(),
                to: to.value!.toAbsoluteString(),
                movingAverage: ma,
              },
            });
            return [ma, data ? countsAPI.de(data!) : []] as [
              MovingAverage,
              CountsAPI,
            ];
          }),
      ),
    );
  }),
);

export const playerUsername = ref("");
export const player = ref<
  ({ ty: "success" } & PlayerAPI) | { ty: "noPlayer" } | null
>(null);
watch(
  [from, to, playerUsername],
  // eslint-disable-next-line max-statements
  wrapLoading(async () => {
    if (dateInvalid.value) return;
    if (!playerUsername.value) {
      player.value = null;
      return;
    }
    try {
      const data = await $fetch(`/player/${playerUsername.value}`, {
        query: {
          from: from.value!.toAbsoluteString(),
          to: to.value!.toAbsoluteString(),
        },
      });
      player.value = { ty: "success", ...playerAPI.de(data) };
    } catch (e) {
      if (e instanceof FetchError && e.status === 404) {
        player.value = { ty: "noPlayer" };
        return;
      }
      throw e;
    }
  }),
);
