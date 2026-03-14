export const STORAGE_KEYS = {
  authToken: "authToken",
  authUser: "authUser",
} as const;

export const DEFAULT_CAMERA_POSITION = { x: 2, y: 2, z: 4 } as const;
export const DEFAULT_BACKGROUND = "#111111";
export const DEFAULT_MODEL_COLOR = "#9a9a9a";

export const SIMPLIFICATION = {
  absoluteMinVertices: 50,
  minPercentOfOriginal: 0.3,
  mergeTolerance: 0.001,
} as const;
