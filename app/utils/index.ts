import * as dt from "@internationalized/date";

export const movingAverages = {
  0: "Raw",
  1: "1h",
  12: "12h",
  24: "1d",
  168: "7d",
} as const;

export type MovingAverage = keyof typeof movingAverages;

export const now = () => dt.now(dt.getLocalTimeZone());

export function hhmm(datetime: dt.AnyTime): string {
  const hour = datetime.hour.toString().padStart(2, "0");
  const minute = datetime.minute.toString().padStart(2, "0");
  return `${hour}:${minute}`;
}
