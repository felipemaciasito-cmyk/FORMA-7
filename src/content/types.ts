// Modèle de contenu de FORMA-7.
// Toute notion utilisée dans un texte s'écrit [[id]] ou [[id|texte affiché]] :
// le validateur (scripts/validate-content.mjs) refuse le build si elle n'a pas été définie avant.

export type Level = "simple" | "standard" | "expert";

export interface Notion {
  id: string;
  term: string;
  /** Identifiant d'icône maison, à choisir dans src/content/icon-ids.json (jamais d'emoji). Inconnu : glyphe générique. */
  icon: string;
  def: Record<Level, string>;
  analogy: string;
  example: string;
  prereq: string[];
  /** Info susceptible d'évoluer (produits, prix) : date de vérification. */
  checked?: string;
}

export type Exercise =
  | { kind: "qcm"; q: string; options: { t: string; ok: boolean; why: string }[] }
  | { kind: "truefalse"; q?: string; items: { s: string; ok: boolean; why: string }[] }
  | { kind: "cloze"; q?: string; text: string; distractors: string[]; why: string }
  | { kind: "order"; q: string; items: string[]; why: string }
  | { kind: "wiring"; q: string; pairs: { l: string; r: string }[]; why: string }
  | { kind: "feynman"; q: string; model: string; criteria: string[] };

export type WidgetId =
  | "NextWord"
  | "CoreCompare"
  | "ContextRam"
  | "PromptLab"
  | "ProjectSim"
  | "SkillAnatomy"
  | "PatchBay"
  | "AgentLoop"
  | "SkillWorkshop";

export type Block =
  | { type: "text"; md: string }
  | { type: "definition"; notion: string }
  | { type: "analogy"; title: string; md: string; art?: string }
  | { type: "interactive"; widget: WidgetId; caption?: string }
  | { type: "example"; title: string; before?: { label: string; md: string }; after: { label: string; md: string }; note?: string }
  | { type: "callout"; tone: "info" | "warn" | "volatile" | "ora"; md: string }
  | { type: "exercise"; ex: Exercise }
  | { type: "recap"; points: string[] };

export interface Step {
  id: string;
  title: string;
  kicker: string; // une phrase d'accroche
  introduces: string[];
  uses: string[];
  blocks: Block[];
}

export interface IncidentScenario {
  alert: string; // le message d'alerte affiché
  q: string;
  options: { t: string; ok: boolean; why: string }[];
}

export interface Incident {
  title: string;
  brief: string;
  scenarios: IncidentScenario[];
}

export interface Room {
  id: string;
  index: number;
  code: string; // ex. "SALLE 01"
  name: string;
  day: number; // jour de la roadmap (0 = initialisation, 8 = bonus)
  roadmapTitle: string; // titre du jour dans la formation
  tagline: string;
  hue: number; // teinte d'accent de la salle (0-360)
  requires: string[];
  steps: Step[];
  incident?: Incident;
  project?: Project;
}

export interface Project {
  title: string;
  goal: string;
  steps: string[];
  success: string[];
}

// ----- Missions issues des mails (dépôt privé forma-7-data) -----

export interface MissionLink {
  url: string;
  title: string;
  kind: "video" | "outil" | "ressource" | "article" | "autre";
  why: string;
}

export interface Mission {
  id: string;
  day: number; // 1..7, 8 = bonus, 0 = hors programme (tes liens [F7])
  room: string;
  title: string;
  receivedAt: string;
  source: { subject: string; from?: string; gmailUrl?: string };
  summary: string[];
  tonight: string[];
  notions: Notion[];
  links: MissionLink[];
  exercises: Exercise[];
  project?: Project;
  blocks?: Block[];
}

export interface DataIndex {
  updatedAt: string;
  missions: { id: string; day: number; room: string; title: string; file: string; receivedAt: string }[];
}
