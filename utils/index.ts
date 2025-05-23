export const movingAverages = {
  0: "Raw",
  1: "1h",
  12: "12h",
  24: "1d",
  168: "7d",
} as const;

export type MovingAverage = keyof typeof movingAverages;
