import { useEffect, useSyncExternalStore } from "react";
import { get, set } from "idb-keyval";
import { registerMissionNotions } from "../content";
import type { DataIndex, Mission } from "../content/types";
import { getState } from "./store";

// ---------------------------------------------------------------
// Lecture des missions privées (dépôt GitHub forma-7-data) via l'API
// GitHub, avec un jeton en lecture seule. Cache local pour le hors-ligne.
// ---------------------------------------------------------------

interface DataState {
  missions: Mission[];
  updatedAt?: string;
  fetchedAt?: string;
  status: "idle" | "loading" | "ok" | "error" | "notoken";
  error?: string;
}

let ds: DataState = { missions: [], status: "idle" };
const ls = new Set<() => void>();
const emit = () => ls.forEach((l) => l());
const CACHE = "forma7:missions";

function setDs(patch: Partial<DataState>) {
  ds = { ...ds, ...patch };
  registerMissionNotions(ds.missions);
  emit();
}

async function gh(path: string) {
  const { ghOwner, ghRepo, ghToken } = getState().settings;
  const url = `https://api.github.com/repos/${encodeURIComponent(ghOwner)}/${encodeURIComponent(ghRepo)}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${ghToken}`, Accept: "application/vnd.github.raw+json", "X-GitHub-Api-Version": "2022-11-28" },
    cache: "no-store",
  });
  if (res.status === 401) throw new Error("Jeton refusé (401) : vérifie qu'il est valide et non expiré.");
  if (res.status === 403) throw new Error("Accès refusé (403) : le jeton n'a pas le droit « Contents: Read » sur ce dépôt, ou la limite d'appels est atteinte.");
  if (res.status === 404) throw new Error("Introuvable (404) : vérifie le nom du compte, du dépôt, et que le jeton donne accès à ce dépôt.");
  if (!res.ok) throw new Error(`Erreur GitHub ${res.status}`);
  return res.json();
}

export async function loadCachedMissions() {
  try {
    const c = await get<DataState>(CACHE);
    if (c?.missions) setDs({ missions: c.missions, updatedAt: c.updatedAt, fetchedAt: c.fetchedAt });
  } catch { /* cache absent */ }
}

let inflight: Promise<void> | null = null;
export function syncMissions(): Promise<void> {
  if (inflight) return inflight;
  const { ghToken } = getState().settings;
  if (!ghToken) { setDs({ status: "notoken" }); return Promise.resolve(); }
  setDs({ status: "loading", error: undefined });
  inflight = (async () => {
    try {
      const idx = (await gh("index.json")) as DataIndex;
      const known = new Map(ds.missions.map((m) => [m.id, m]));
      const missions: Mission[] = [];
      for (const e of idx.missions ?? []) {
        const cached = known.get(e.id);
        if (cached && cached.receivedAt === e.receivedAt) { missions.push(cached); continue; }
        missions.push((await gh(e.file)) as Mission);
      }
      missions.sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
      const fetchedAt = new Date().toISOString();
      setDs({ missions, updatedAt: idx.updatedAt, fetchedAt, status: "ok" });
      await set(CACHE, { missions, updatedAt: idx.updatedAt, fetchedAt });
    } catch (e) {
      setDs({ status: "error", error: e instanceof Error ? e.message : String(e) });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Test de connexion pour l'écran Réglages. */
export async function testGithub(): Promise<string> {
  const idx = (await gh("index.json")) as DataIndex;
  return `Connexion réussie : ${idx.missions?.length ?? 0} mission(s), mise à jour ${idx.updatedAt ? new Date(idx.updatedAt).toLocaleString("fr-FR") : "inconnue"}.`;
}

export function useMissions() {
  const s = useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => ds, () => ds);
  return s;
}

/** Synchronise au démarrage puis quand l'appli revient au premier plan. */
export function useAutoSync() {
  useEffect(() => {
    loadCachedMissions().then(() => syncMissions());
    const onVis = () => { if (document.visibilityState === "visible") syncMissions(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
}
