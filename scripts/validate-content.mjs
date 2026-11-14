#!/usr/bin/env node
// =====================================================================
// Validateur « zéro zone de flou » de FORMA-7.
//
// Règles (le build échoue si l'une d'elles est violée) :
//  1. Chaque notion du glossaire a un id unique, 3 niveaux de définition,
//     une analogie, un exemple, et des prérequis qui existent (sans boucle).
//  2. Les salles sont parcourues dans l'ordre. Une notion doit être
//     introduite (introduces) avant d'être utilisée (uses ou [[id]]).
//  3. Les prérequis d'une notion doivent être introduits avant elle.
//  4. Les [[références]] dans les définitions ne pointent que vers des
//     notions déjà connues au moment où la notion est introduite.
//  5. Un mot technique « surveillé » (champ watch) ne peut pas apparaître
//     en clair dans une étape avant que sa notion soit introduite.
//  6. Les exercices sont bien formés (au moins une bonne réponse, etc.).
//  7. Option --data <dossier> : valide aussi les missions issues des mails.
//  8. Zéro emoji : aucun emoji ni symbole décoratif dans le glossaire, les
//     salles et les missions ; le champ « icon » d'une notion est un
//     identifiant de src/content/icon-ids.json.
//
// Usage : node scripts/validate-content.mjs [--data ../forma-7-data]
// =====================================================================
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { codepoint, findEmoji } from "../src/lib/emoji-rules.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const contentDir = join(root, "src", "content");

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`✗ [${where}] ${msg}`);
const warn = (where, msg) => warnings.push(`! [${where}] ${msg}`);

const readJSON = (p) => JSON.parse(readFileSync(p, "utf8"));

// ---------- Chargement ----------
const glossary = readJSON(join(contentDir, "glossary.json"));
const roomsDir = join(contentDir, "rooms");
const rooms = readdirSync(roomsDir).filter((f) => f.endsWith(".json")).map((f) => ({ file: f, ...readJSON(join(roomsDir, f)) }))
  .sort((a, b) => a.index - b.index);

const iconIds = readJSON(join(contentDir, "icon-ids.json"));
const ICONS = new Set([...Object.keys(iconIds.notions), ...Object.keys(iconIds.interface)]);

// ---------- 8. Zéro emoji ----------
/** Signale chaque emoji présent dans n'importe quelle chaîne (y compris les clés). */
function checkNoEmoji(obj, where) {
  const seen = new Set();
  const walk = (v, path) => {
    if (typeof v === "string") {
      for (const { char } of findEmoji(v)) {
        const k = `${path}:${char}`;
        if (seen.has(k)) continue;
        seen.add(k);
        err(where, `emoji interdit « ${char} » (${codepoint(char)}) dans ${path || "le texte"} : remplace-le par des mots, ou par un identifiant d'icône de src/content/icon-ids.json pour le champ icon. Texte : « ${v.slice(0, 70)} »`);
      }
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { walk(k, path ? `${path}.${k}` : k); walk(x, path ? `${path}.${k}` : k); }
  };
  walk(obj, "");
}
function checkIcon(n, where) {
  if (!n.icon) err(where, `notion ${n.id} : champ icon manquant (identifiant de src/content/icon-ids.json)`);
  else if (!ICONS.has(n.icon)) err(where, `notion ${n.id} : icône « ${n.icon} » inconnue. Choisis un identifiant dans src/content/icon-ids.json (section « notions »), par exemple « ${[...Object.keys(iconIds.notions)].slice(0, 4).join(" », « ")} ».`);
}

const byId = new Map();
for (const n of glossary) {
  if (byId.has(n.id)) err("glossaire", `id en double : ${n.id}`);
  byId.set(n.id, n);
}

// ---------- Utilitaires texte ----------
const REF_RE = /\[\[([a-z0-9-]+)(?:\|[^\]]+)?\]\]/g;
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function refsIn(text) { return [...String(text).matchAll(REF_RE)].map((m) => m[1]); }
function stripRefs(text) { return String(text).replace(REF_RE, " ").replace(/`[^`]*`/g, " "); }
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function containsWord(text, word) {
  const t = norm(stripRefs(text));
  const w = norm(word);
  const re = new RegExp(`(^|[^a-z0-9])${escapeRe(w)}($|[^a-z0-9])`, "i");
  return re.test(t);
}

/** Récupère toutes les chaînes de texte d'un bloc ou d'un exercice. */
function textsOf(obj) {
  const out = [];
  const walk = (v, key) => {
    if (typeof v === "string") { if (!["type", "kind", "widget", "notion", "art", "tone", "id", "url", "file"].includes(key)) out.push(v); }
    else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(obj, "");
  return out;
}

// ---------- 1. Glossaire ----------
for (const n of glossary) {
  const w = `notion ${n.id}`;
  if (!/^[a-z0-9-]+$/.test(n.id)) err(w, "id invalide (minuscules, chiffres, tirets)");
  for (const lv of ["simple", "standard", "expert"]) if (!n.def?.[lv] || n.def[lv].length < 20) err(w, `définition « ${lv} » manquante ou trop courte`);
  if (!n.analogy) err(w, "analogie manquante");
  if (!n.example) err(w, "exemple manquant");
  if (!n.term) err(w, "terme manquant");
  checkIcon(n, "glossaire");
  for (const p of n.prereq ?? []) if (!byId.has(p)) err(w, `prérequis inconnu : ${p}`);
}
// boucles de prérequis
{
  const state = new Map();
  const visit = (id, path) => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) { err("glossaire", `boucle de prérequis : ${[...path, id].join(" → ")}`); return; }
    state.set(id, 1);
    for (const p of byId.get(id)?.prereq ?? []) visit(p, [...path, id]);
    state.set(id, 2);
  };
  for (const n of glossary) visit(n.id, []);
}

checkNoEmoji(glossary, "glossaire");
for (const room of rooms) checkNoEmoji(room, room.file);

// ---------- 6. Exercices ----------
function checkExercise(ex, where) {
  switch (ex.kind) {
    case "qcm":
      if (!ex.q) err(where, "QCM sans question");
      if (!ex.options?.length || ex.options.length < 2) err(where, "QCM : au moins 2 options");
      if (!ex.options?.some((o) => o.ok)) err(where, "QCM : aucune bonne réponse");
      for (const o of ex.options ?? []) if (!o.why) err(where, `QCM : option « ${o.t} » sans explication`);
      break;
    case "truefalse":
      if (!ex.items?.length) err(where, "Vrai/faux vide");
      for (const it of ex.items ?? []) if (typeof it.ok !== "boolean" || !it.why) err(where, `Vrai/faux mal formé : ${it.s}`);
      break;
    case "cloze": {
      const blanks = [...String(ex.text).matchAll(/\{\{([^}]+)\}\}/g)];
      if (!blanks.length) err(where, "Texte à trous sans {{trou}}");
      if (!ex.why) err(where, "Texte à trous sans explication");
      break;
    }
    case "order":
      if ((ex.items?.length ?? 0) < 3) err(where, "Remise en ordre : au moins 3 éléments");
      if (!ex.why) err(where, "Remise en ordre sans explication");
      break;
    case "wiring":
      if ((ex.pairs?.length ?? 0) < 3) err(where, "Câblage : au moins 3 paires");
      if (!ex.why) err(where, "Câblage sans explication");
      break;
    case "feynman":
      if (!ex.model || !(ex.criteria?.length >= 2)) err(where, "Feynman : réponse modèle et au moins 2 critères requis");
      break;
    default:
      err(where, `type d'exercice inconnu : ${ex.kind}`);
  }
}

// ---------- 2-5. Parcours des salles ----------
const known = new Set();
const introducedWhere = new Map();

function introduce(ids, where, stepIntro) {
  for (const id of ids) {
    const n = byId.get(id);
    if (!n) { err(where, `introduit une notion inconnue : ${id}`); continue; }
    if (introducedWhere.has(id)) err(where, `notion « ${id} » déjà introduite dans ${introducedWhere.get(id)}`);
    for (const p of n.prereq ?? []) if (!known.has(p) && !stepIntro.has(p)) err(where, `notion « ${id} » introduite avant son prérequis « ${p} »`);
    for (const lv of ["simple", "standard", "expert"]) for (const r of refsIn(n.def[lv])) {
      if (!byId.has(r)) err(`notion ${id}`, `définition ${lv} : référence inconnue [[${r}]]`);
      else if (!known.has(r) && !stepIntro.has(r)) err(`notion ${id}`, `définition ${lv} : [[${r}]] n'est pas encore définie au moment où « ${id} » est introduite (${where})`);
    }
  }
  for (const id of ids) { known.add(id); introducedWhere.set(id, where); }
}

function checkTexts(texts, where, allowed) {
  for (const t of texts) {
    for (const r of refsIn(t)) {
      if (!byId.has(r)) err(where, `référence inconnue [[${r}]]`);
      else if (!known.has(r) && !allowed.has(r)) err(where, `[[${r}]] utilisée avant d'être définie`);
    }
    for (const n of glossary) {
      if (known.has(n.id) || allowed.has(n.id)) continue;
      for (const w of n.watch ?? []) {
        if (containsWord(t, w)) err(where, `le mot « ${w} » apparaît avant que la notion « ${n.id} » soit définie. Balise-le [[${n.id}]] après l'avoir introduite, ou reformule. Texte : « ${t.slice(0, 90)}… »`);
      }
    }
  }
}

const roomIds = new Set(rooms.map((r) => r.id));
for (const room of rooms) {
  const rw = `${room.file}`;
  for (const req of room.requires ?? []) if (!roomIds.has(req)) err(rw, `salle requise inconnue : ${req}`);
  // Le titre d'une salle annonce son sujet : il peut nommer les notions que la salle va définir.
  checkTexts([room.name, room.tagline], rw, new Set(room.steps.flatMap((s) => s.introduces)));
  for (const step of room.steps) {
    const where = `${room.id}/${step.id}`;
    const stepIntro = new Set(step.introduces);
    introduce(step.introduces, where, stepIntro);
    for (const u of step.uses ?? []) {
      if (!byId.has(u)) err(where, `uses : notion inconnue ${u}`);
      else if (!known.has(u)) err(where, `uses : « ${u} » utilisée avant d'être définie`);
    }
    // Les notions introduites doivent avoir un bloc « definition » dans l'étape.
    const defined = new Set(step.blocks.filter((b) => b.type === "definition").map((b) => b.notion));
    for (const id of step.introduces) if (!defined.has(id)) err(where, `la notion « ${id} » est introduite sans bloc de définition`);
    checkTexts([step.title, step.kicker, ...step.blocks.flatMap((b) => textsOf(b))], where, new Set());
    step.blocks.forEach((b, i) => {
      if (b.type === "exercise") checkExercise(b.ex, `${where} bloc ${i}`);
      if (b.type === "definition" && !byId.has(b.notion)) err(where, `définition d'une notion inconnue : ${b.notion}`);
    });
    if (!step.blocks.some((b) => b.type === "exercise")) warn(where, "étape sans exercice de vérification");
  }
  if (room.incident) {
    const where = `${room.id}/incident`;
    checkTexts(textsOf(room.incident), where, new Set());
    for (const s of room.incident.scenarios) checkExercise({ kind: "qcm", q: s.q, options: s.options }, where);
  }
  if (room.project) checkTexts(textsOf(room.project), `${room.id}/projet`, new Set());
}

for (const n of glossary) if (!introducedWhere.has(n.id)) warn("glossaire", `notion jamais introduite dans une salle : ${n.id}`);

// ---------- 7. Missions issues des mails ----------
const dataArg = process.argv.indexOf("--data");
if (dataArg > -1) {
  const dataDir = process.argv[dataArg + 1];
  const idxPath = join(dataDir, "index.json");
  if (!existsSync(idxPath)) err("data", `index.json introuvable dans ${dataDir}`);
  else {
    const idx = readJSON(idxPath);
    checkNoEmoji(idx, "index.json");
    const allKnown = new Set(glossary.map((n) => n.id));
    for (const entry of idx.missions ?? []) {
      const p = join(dataDir, entry.file);
      const w = `mission ${entry.id}`;
      if (!existsSync(p)) { err(w, `fichier manquant : ${entry.file}`); continue; }
      const m = readJSON(p);
      checkNoEmoji(m, w);
      for (const f of ["id", "day", "room", "title", "receivedAt", "summary", "tonight", "notions", "links", "exercises"]) if (m[f] === undefined) err(w, `champ manquant : ${f}`);
      if (m.id !== entry.id) err(w, "l'id du fichier ne correspond pas à index.json");
      if (!roomIds.has(m.room)) err(w, `salle inconnue : ${m.room}`);
      const local = new Set();
      for (const n of m.notions ?? []) {
        if (allKnown.has(n.id) && !local.has(n.id) && byId.has(n.id)) err(w, `notion « ${n.id} » existe déjà dans le glossaire : réutilise [[${n.id}]] au lieu de la redéfinir`);
        for (const lv of ["simple", "standard", "expert"]) if (!n.def?.[lv]) err(w, `notion ${n.id} : définition ${lv} manquante`);
        if (!n.analogy || !n.example) err(w, `notion ${n.id} : analogie ou exemple manquant`);
        checkIcon(n, w);
        for (const pr of n.prereq ?? []) if (!allKnown.has(pr) && !local.has(pr)) err(w, `notion ${n.id} : prérequis inconnu ${pr}`);
        local.add(n.id);
      }
      const allowed = new Set([...allKnown, ...local]);
      const texts = [m.title, ...(m.summary ?? []), ...(m.tonight ?? []), ...textsOf(m.exercises ?? []), ...textsOf(m.project ?? {}), ...textsOf(m.blocks ?? []), ...(m.links ?? []).map((l) => l.why)];
      for (const t of texts) for (const r of refsIn(t)) if (!allowed.has(r)) err(w, `référence [[${r}]] non définie (ni dans le glossaire, ni dans la mission)`);
      for (const n of m.notions ?? []) for (const lv of ["simple", "standard", "expert"]) for (const r of refsIn(n.def?.[lv] ?? "")) {
        if (!allowed.has(r)) err(w, `notion ${n.id} : définition ${lv} cite [[${r}]], non définie`);
      }
      (m.exercises ?? []).forEach((ex, i) => checkExercise(ex, `${w} exercice ${i}`));
      for (const l of m.links ?? []) if (!/^https?:\/\//.test(l.url)) err(w, `lien invalide : ${l.url}`);
      for (const n of m.notions ?? []) allKnown.add(n.id);
    }
  }
}

// ---------- Rapport ----------
const nNotions = glossary.length;
const nSteps = rooms.reduce((a, r) => a + r.steps.length, 0);
console.log(`FORMA-7 · validation du contenu : ${rooms.length} salles, ${nSteps} étapes, ${nNotions} notions.`);
for (const w of warnings) console.log(w);
if (errors.length) {
  for (const e of errors) console.error(e);
  console.error(`\n${errors.length} erreur(s) : des zones de flou ont été détectées. Build bloqué.`);
  process.exit(1);
}
console.log("✓ Aucune zone de flou détectée.");
