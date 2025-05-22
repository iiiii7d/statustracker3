// https://stackoverflow.com/questions/60141960/typescript-key-value-relation-preserving-object-entries-type
export type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

export const movingAverages = {
  0: "Raw",
  1: "1h",
  12: "12h",
  24: "1d",
  168: "7d",
} as const;

export type MovingAverage = keyof typeof movingAverages;
