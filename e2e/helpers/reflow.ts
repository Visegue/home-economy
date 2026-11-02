// Each case has a distinct layout risk; theme changes do not replay mutations.
export const actionReflowCases = [
  { width: 320, height: 640, textSize: "100%", theme: "light" },
  { width: 1440, height: 900, textSize: "100%", theme: "light" },
  { width: 384, height: 360, textSize: "100%", theme: "light" },
  { width: 320, height: 640, textSize: "200%", theme: "dark" },
] as const;

// Auth uses the same full-width controls; the other action tests cover desktop
// and short-height dialogs. Retain narrow and enlarged-text auth regressions.
export const authReflowCases = [actionReflowCases[0], actionReflowCases[3]];
