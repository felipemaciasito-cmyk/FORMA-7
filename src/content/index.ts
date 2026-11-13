import glossaryJson from "./glossary.json";
import type { Mission, Notion, Room } from "./types";

const roomModules = import.meta.glob<{ default: Room }>("./rooms/*.json", { eager: true });

export const ROOMS: Room[] = Object.values(roomModules).map((m) => m.default).sort((a, b) => a.index - b.index);
export const BASE_NOTIONS = glossaryJson as unknown as Notion[];

const base = new Map(BASE_NOTIONS.map((n) => [n.id, n]));
let extra = new Map<string, Notion>();
const extraOrigin = new Map<string, string>();

/** Ajoute les notions apportées par les missions (mails) au glossaire. */
export function registerMissionNotions(missions: Mission[]) {
  extra = new Map();
  for (const m of missions) for (const n of m.notions ?? []) {
    if (!base.has(n.id)) { extra.set(n.id, n); extraOrigin.set(n.id, m.id); }
  }
}

export function notion(id: string): Notion | undefined { return base.get(id) ?? extra.get(id); }
export function allNotions(): Notion[] { return [...BASE_NOTIONS, ...extra.values()]; }
export function notionOrigin(id: string): { room?: Room; missionId?: string } {
  const mid = extraOrigin.get(id);
  if (mid) return { missionId: mid };
  for (const r of ROOMS) for (const s of r.steps) if (s.introduces.includes(id)) return { room: r };
  return {};
}

export function room(id: string) { return ROOMS.find((r) => r.id === id); }
export const stepKey = (roomId: string, stepId: string) => `${roomId}/${stepId}`;
export const PROGRAM_ROOMS = ROOMS.filter((r) => r.day <= 7);
