import { ROOMS, stepKey } from "../content";
import type { Room } from "../content/types";
import type { Progress } from "./store";

// Calculs dérivés de la progression : salles débloquées, terminées, énergie de chaque salle.

export function roomStepsDone(p: Progress, r: Room) {
  return r.steps.filter((s) => p.steps[stepKey(r.id, s.id)]).length;
}

export function roomComplete(p: Progress, r: Room) {
  const stepsOk = roomStepsDone(p, r) === r.steps.length;
  const incidentOk = !r.incident || !!p.incidents[r.id];
  return stepsOk && incidentOk;
}

export function roomUnlocked(p: Progress, r: Room) {
  return r.requires.every((id) => {
    const req = ROOMS.find((x) => x.id === id);
    return req ? roomComplete(p, req) : true;
  });
}

/** Pourcentage d'alimentation d'une salle (étapes + incident). */
export function roomPower(p: Progress, r: Room) {
  const total = r.steps.length + (r.incident ? 1 : 0);
  const done = roomStepsDone(p, r) + (r.incident && p.incidents[r.id] ? 1 : 0);
  return Math.round((done / total) * 100);
}

export function stepUnlocked(p: Progress, r: Room, index: number) {
  if (index === 0) return true;
  return !!p.steps[stepKey(r.id, r.steps[index - 1].id)];
}

export function currentRoom(p: Progress) {
  return ROOMS.find((r) => roomUnlocked(p, r) && !roomComplete(p, r)) ?? ROOMS[ROOMS.length - 1];
}

export function roomsDoneCount(p: Progress) {
  return ROOMS.filter((r) => r.day <= 7 && roomComplete(p, r)).length;
}

export function totalPower(p: Progress) {
  const rooms = ROOMS.filter((r) => r.day <= 7);
  return Math.round(rooms.reduce((a, r) => a + roomPower(p, r), 0) / rooms.length);
}
