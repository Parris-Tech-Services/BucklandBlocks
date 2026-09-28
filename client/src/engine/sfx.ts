import { BlockType } from "./blocks";

// Minecraft-style block sounds, synthesised with Web Audio so no sound files
// are needed. Call playHit() on each swing while mining, playBreak() when a
// block breaks and playPlace() when one is placed.

export type Material = "wood" | "stone" | "dirt" | "sand" | "grass" | "glass";

const MATERIAL: Partial<Record<BlockType, Material>> = {
  [BlockType.WOOD_LOG]: "wood",
  [BlockType.WOOD_PLANK]: "wood",
  [BlockType.WOOD]: "wood",
  [BlockType.DOOR_BOTTOM]: "wood",
  [BlockType.DOOR_TOP]: "wood",
  [BlockType.TORCH]: "wood",
  [BlockType.CHEST]: "wood",
  [BlockType.CRAFTING_TABLE]: "wood",
  [BlockType.STONE]: "stone",
  [BlockType.COBBLESTONE]: "stone",
  [BlockType.BRICK]: "stone",
  [BlockType.FURNACE]: "stone",
  [BlockType.DIRT]: "dirt",
  [BlockType.GRASS]: "grass",
  [BlockType.LEAF]: "grass",
  [BlockType.SAND]: "sand",
  [BlockType.GLASS]: "glass",
};

export function materialOf(blockType: BlockType): Material {
  return MATERIAL[blockType] ?? "dirt";
}

// Seconds between swing sounds while the mouse is held on a block.
export const HIT_INTERVAL_SECONDS = 0.25;

interface Voice {
  /** Low-pass cutoff for the noise burst, in Hz. */
  cutoff: number;
  /** Optional pitched body (a knock), in Hz. */
  tone?: number;
  duration: number;
  gain: number;
}

const VOICES: Record<Material, Voice> = {
  wood: { cutoff: 1400, tone: 180, duration: 0.09, gain: 0.5 },
  stone: { cutoff: 3200, tone: 420, duration: 0.07, gain: 0.45 },
  dirt: { cutoff: 700, duration: 0.1, gain: 0.55 },
  grass: { cutoff: 2200, duration: 0.11, gain: 0.35 },
  sand: { cutoff: 1800, duration: 0.12, gain: 0.35 },
  glass: { cutoff: 6000, tone: 1800, duration: 0.14, gain: 0.3 },
};

let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let muted = false;
let volume = 0.6;

export function setSfxMuted(value: boolean) {
  muted = value;
}

export function setSfxVolume(value: number) {
  volume = Math.min(1, Math.max(0, value));
}

function audio(): AudioContext | null {
  if (muted || typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  // Browsers start audio suspended until a user gesture; mining is one.
  if (context.state === "suspended") void context.resume();
  if (!noise) {
    noise = context.createBuffer(1, context.sampleRate / 2, context.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  return context;
}

function play(material: Material, loudness: number, pitch: number) {
  const ctx = audio();
  if (!ctx || !noise) return;
  const voice = VOICES[material];
  const now = ctx.currentTime;
  // A little random pitch per hit, like Minecraft, so repeats don't drone.
  const jitter = pitch * (0.9 + Math.random() * 0.2);
  const peak = voice.gain * loudness * volume;

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(peak, now);
  envelope.gain.exponentialRampToValueAtTime(0.001, now + voice.duration);
  envelope.connect(ctx.destination);

  const source = ctx.createBufferSource();
  source.buffer = noise;
  source.playbackRate.value = jitter;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = voice.cutoff * jitter;
  source.connect(filter).connect(envelope);
  source.start(now, Math.random() * 0.3, voice.duration);

  if (voice.tone) {
    const knock = ctx.createOscillator();
    knock.type = "triangle";
    knock.frequency.setValueAtTime(voice.tone * jitter, now);
    knock.frequency.exponentialRampToValueAtTime(
      (voice.tone * jitter) / 2,
      now + voice.duration,
    );
    knock.connect(envelope);
    knock.start(now);
    knock.stop(now + voice.duration);
  }
}

export function playHit(blockType: BlockType) {
  play(materialOf(blockType), 0.6, 1.2);
}

export function playBreak(blockType: BlockType) {
  play(materialOf(blockType), 1, 0.8);
}

export function playPlace(blockType: BlockType) {
  play(materialOf(blockType), 0.9, 1);
}

/**
 * Tracks when the next swing sound is due while mining. Returns true when a
 * hit sound should play this frame.
 */
export function createHitTimer() {
  let untilNext = 0;
  return (holding: boolean, delta: number): boolean => {
    if (!holding) {
      untilNext = 0;
      return false;
    }
    untilNext -= delta;
    if (untilNext > 0) return false;
    untilNext = HIT_INTERVAL_SECONDS;
    return true;
  };
}
