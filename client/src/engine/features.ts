// Feature gates: new features ship switched off and are turned on per player
// for testing, so an unfinished feature can't break the working game.
//   Turn on for one visit:  https://buckland-blocks.vercel.app/?features=newinventory,ores
//   Keep on (this browser): add &features-save=1 to that URL
//   Turn one off:           ?features=-newinventory
//   Turn everything off:    ?features=none&features-save=1 (then list any to keep)
// When a feature is ready for everyone, flip its default to true below.

export const FEATURE_DEFAULTS = {
  // e.g. newinventory: false,
} satisfies Record<string, boolean>;

export type Feature = keyof typeof FEATURE_DEFAULTS;

const STORAGE_KEY = "buckland_features";

export interface FeatureOverrides {
  /** "none" was given: every feature is off unless listed. */
  resetDefaults: boolean;
  on: Set<string>;
  off: Set<string>;
}

/** Parses e.g. "ores,-newinventory" or "none,ores". */
export function parseFeatureList(value: string | null | undefined): FeatureOverrides {
  const overrides: FeatureOverrides = { resetDefaults: false, on: new Set(), off: new Set() };
  for (const raw of (value ?? "").split(",")) {
    const name = raw.trim().toLowerCase();
    if (!name) continue;
    if (name === "none") overrides.resetDefaults = true;
    else if (name.startsWith("-")) overrides.off.add(name.slice(1));
    else overrides.on.add(name);
  }
  return overrides;
}

function readOverrides(): FeatureOverrides {
  if (typeof window === "undefined") return parseFeatureList(null);
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("features");
    if (fromUrl !== null) {
      if (params.get("features-save") === "1") window.localStorage.setItem(STORAGE_KEY, fromUrl);
      return parseFeatureList(fromUrl);
    }
    return parseFeatureList(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return parseFeatureList(null);
  }
}

const overrides = readOverrides();

export function resolveFeature(
  feature: string,
  given: FeatureOverrides,
  defaults: Record<string, boolean> = FEATURE_DEFAULTS,
): boolean {
  const name = feature.toLowerCase();
  if (given.off.has(name)) return false;
  if (given.on.has(name)) return true;
  return given.resetDefaults ? false : defaults[feature] ?? false;
}

export function isFeatureOn(feature: Feature | string): boolean {
  return resolveFeature(String(feature), overrides);
}
