// Feature gates: new features ship switched off and are turned on per player
// for testing, so an unfinished feature can't break the working game.
//   Turn on for one visit:  https://buckland-blocks.vercel.app/?features=newinventory,ores
//   Keep on (this browser): add &features-save=1 to that URL
//   Turn everything off:    ?features=none&features-save=1
// When a feature is ready for everyone, flip its default to true below.

export const FEATURE_DEFAULTS = {
  // e.g. newinventory: false,
} satisfies Record<string, boolean>;

export type Feature = keyof typeof FEATURE_DEFAULTS;

const STORAGE_KEY = "buckland_features";

export function parseFeatureList(value: string | null | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter((name) => name && name !== "none"),
  );
}

function enabledOverrides(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("features");
    if (fromUrl !== null) {
      if (params.get("features-save") === "1") window.localStorage.setItem(STORAGE_KEY, fromUrl);
      return parseFeatureList(fromUrl);
    }
    return parseFeatureList(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return new Set();
  }
}

const overrides = enabledOverrides();

export function isFeatureOn(feature: Feature | string): boolean {
  if (overrides.has(String(feature).toLowerCase())) return true;
  return (FEATURE_DEFAULTS as Record<string, boolean>)[feature] ?? false;
}
