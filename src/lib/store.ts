import { useSyncExternalStore } from "react";
import { get, set } from "idb-keyval";

// ---------------------------------------------------------------
// État persistant de FORMA-7 (stocké sur l'appareil, IndexedDB).
// ---------------------------------------------------------------

export interface NotionState { box: number; due: string; seenAt: string; room: string }
export interface SavedSkill {
  id: string;
  name: string;
  description: string;
  title: string;
  when: string;
  steps: string[];
  output: string;
  examples: { input: string; output: string }[];
  avoid: string[];
  updatedAt: string;
  finalized?: boolean;
}

export interface Progress {
  version: 1;
  name: string;
  bootedOnce: boolean;
  energy: number;
  steps: Record<string, string>; // "r1/s2" -> date
  exercises: Record<string, number>; // clé d'exercice -> nombre d'essais avant réussite
  incidents: Record<string, { at: string; fusesLeft: number }>;
  notions: Record<string, NotionState>;
  missions: Record<string, string>;
  days: string[];
  badges: Record<string, string>;
  feynman: Record<string, number>;
  skills: SavedSkill[];
  stats: { answers: number; correct: number; reviews: number };
  orientationSeen: string[];
  checks: Record<string, boolean>;
}

export interface Settings {
  sound: boolean;
  reduceMotion: "auto" | "on" | "off";
  ghOwner: string;
  ghRepo: string;
  ghToken: string;
  apiKey: string;
  model: string;
}

export const DEFAULT_PROGRESS: Progress = {
  version: 1,
  name: "",
  bootedOnce: false,
  energy: 0,
  steps: {},
  exercises: {},
  incidents: {},
  notions: {},
  missions: {},
  days: [],
  badges: {},
  feynman: {},
  skills: [],
  stats: { answers: 0, correct: 0, reviews: 0 },
  orientationSeen: [],
  checks: {},
};

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  reduceMotion: "auto",
  ghOwner: "felipemaciasito-cmyk",
  ghRepo: "forma-7-data",
  ghToken: "",
  apiKey: "",
  model: "claude-opus-5-5",
};

interface State { progress: Progress; settings: Settings; ready: boolean }

let state: State = { progress: DEFAULT_PROGRESS, settings: DEFAULT_SETTINGS, ready: false };
const listeners = new Set<() => void>();
const KEY_P = "forma7:progress";
const KEY_S = "forma7:settings";

function emit() { listeners.forEach((l) => l()); }

let saveTimer: number | undefined;
function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    set(KEY_P, state.progress).catch(() => {});
    set(KEY_S, state.settings).catch(() => {});
  }, 250);
}

export async function initStore() {
  try {
    const [p, s] = await Promise.all([get<Progress>(KEY_P), get<Settings>(KEY_S)]);
    state = {
      progress: { ...DEFAULT_PROGRESS, ...(p ?? {}) , stats: { ...DEFAULT_PROGRESS.stats, ...(p?.stats ?? {}) } },
      settings: { ...DEFAULT_SETTINGS, ...(s ?? {}) },
      ready: true,
    };
  } catch {
    state = { ...state, ready: true };
  }
  // Demande au navigateur de ne pas effacer les données (pas toujours accordé, surtout sur iOS).
  try { await navigator.storage?.persist?.(); } catch { /* ignoré */ }
  emit();
}

export function getState() { return state; }

export function updateProgress(fn: (p: Progress) => Progress | void) {
  const draft = structuredClone(state.progress);
  const res = fn(draft) ?? draft;
  state = { ...state, progress: res };
  scheduleSave();
  emit();
}

export function updateSettings(patch: Partial<Settings>) {
  state = { ...state, settings: { ...state.settings, ...patch } };
  scheduleSave();
  emit();
}

export function replaceProgress(p: Progress) {
  state = { ...state, progress: { ...DEFAULT_PROGRESS, ...p } };
  scheduleSave();
  emit();
}

function subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); }

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}
export const useProgress = () => useStore((s) => s.progress);
export const useSettings = () => useStore((s) => s.settings);

// ---------- Dates ----------
export function today(d = new Date()) {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function addDays(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return today(d);
}
