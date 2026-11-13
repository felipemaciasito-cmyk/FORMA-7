import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { notion, room as getRoom, stepKey } from "../content";
import type { Room } from "../content/types";
import { addEnergy, checkBadges, fx, learnNotions, REWARD } from "../lib/game";
import { roomComplete, roomPower, roomStepsDone, roomUnlocked, stepUnlocked } from "../lib/progress";
import { go } from "../lib/router";
import { sfx } from "../lib/sound";
import { getState, today, updateProgress, useProgress } from "../lib/store";
import { useMissions } from "../lib/data";
import { exportRoomFiche } from "../lib/fiche";
import { BlockView } from "./Blocks";
import { TopBar } from "./Chrome";
import { Icon } from "./Icon";
import { OraSays } from "./Ora";

// ======================= Salle =======================
export function RoomView({ id }: { id: string }) {
  const r = getRoom(id);
  const p = useProgress();
  const { missions } = useMissions();
  if (!r) return <div className="wrap"><p>Salle introuvable.</p></div>;
  if (!roomUnlocked(p, r)) return <div className="wrap"><TopBar title={r.name} kicker={r.code} onBack={() => go("")} /><OraSays mood="alert" md="Cette salle est encore hors tension. Termine la salle précédente pour y envoyer le courant." /></div>;
  const power = roomPower(p, r);
  const done = roomStepsDone(p, r);
  const stepsAll = done === r.steps.length;
  const signals = missions.filter((m) => m.room === r.id);
  return (
    <div className="wrap" style={{ ["--hue" as string]: r.hue }}>
      <TopBar title={r.name} kicker={`${r.code} · ${r.roadmapTitle}`} onBack={() => go("")} />
      <motion.div className="panel glow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: `linear-gradient(150deg, hsl(${r.hue} 80% 50% / .16), rgba(12,19,34,.9) 55%)`, borderColor: `hsl(${r.hue} 90% 60% / .35)` }}>
        <div style={{ fontSize: 17, marginBottom: 12 }}>{r.tagline}</div>
        <div className="row"><span className="mono small grow">ALIMENTATION DE LA SALLE</span><span className="mono" style={{ color: "var(--accent)" }}>{power} %</span></div>
        <div className="progress" style={{ marginTop: 6, height: 8 }}><motion.i initial={{ width: 0 }} animate={{ width: `${power}%` }} transition={{ duration: 0.9 }} /></div>
      </motion.div>

      <div className="panel-title" style={{ marginTop: 20 }}>Baies à rallumer</div>
      <div className="stack">
        {r.steps.map((s, i) => {
          const sdone = !!p.steps[stepKey(r.id, s.id)];
          const open = stepUnlocked(p, r, i);
          return (
            <motion.button key={s.id} className="choice" whileTap={{ scale: open ? 0.98 : 1 }} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
              onClick={() => { if (open) { sfx("open"); go(`salle/${r.id}/${s.id}`); } else { sfx("ko"); fx({ type: "toast", icon: "🔒", text: "Termine la baie précédente d'abord", tone: "red" }); } }}
              style={{ alignItems: "center", opacity: open ? 1 : 0.5, borderColor: sdone ? "rgba(77,255,160,.4)" : open && !sdone ? "var(--accent)" : undefined }}>
              <RackIcon state={sdone ? "done" : open ? "open" : "locked"} hue={r.hue} />
              <span className="grow">
                <span className="mono" style={{ fontSize: 10.5, color: "var(--text-3)", letterSpacing: ".1em" }}>BAIE {String(i + 1).padStart(2, "0")}</span>
                <span style={{ display: "block", fontWeight: 700 }}>{s.title}</span>
                <span className="small muted">{s.introduces.length ? s.introduces.map((n) => notion(n)?.term.replace(/ \(.+\)$/, "")).join(" · ") : s.kicker}</span>
              </span>
              {sdone ? <span className="pill led">OK</span> : open ? <Icon name="play" size={16} /> : <Icon name="lock" size={16} />}
            </motion.button>
          );
        })}
      </div>

      {r.incident && (
        <motion.button className="panel" whileTap={{ scale: stepsAll ? 0.98 : 1 }} onClick={() => { if (stepsAll) { sfx("alarm"); go(`incident/${r.id}`); } else { sfx("ko"); } }}
          style={{ width: "100%", textAlign: "left", marginTop: 14, opacity: stepsAll ? 1 : 0.55, borderColor: p.incidents[r.id] ? "rgba(77,255,160,.4)" : "rgba(255,77,109,.45)", background: p.incidents[r.id] ? "rgba(77,255,160,.06)" : "linear-gradient(120deg, rgba(255,77,109,.14), rgba(12,19,34,.9))" }}>
          <div className="row">
            <span style={{ fontSize: 26 }}>{p.incidents[r.id] ? "🧯" : "🚨"}</span>
            <span className="grow">
              <span className="kicker" style={{ color: p.incidents[r.id] ? "var(--led)" : "var(--red)" }}>{p.incidents[r.id] ? "Incident résolu" : "Incident critique"}</span>
              <span style={{ display: "block", fontWeight: 700 }}>{r.incident.title}</span>
              <span className="small muted">{stepsAll ? r.incident.brief : "Disponible quand toutes les baies sont rallumées."}</span>
            </span>
          </div>
        </motion.button>
      )}

      {signals.length > 0 && (
        <>
          <div className="panel-title" style={{ marginTop: 20, color: "var(--amber)" }}>📡 Signaux reçus pour cette salle</div>
          <div className="stack">
            {signals.map((m) => (
              <button key={m.id} className="choice" onClick={() => go(`signal/${m.id}`)} style={{ alignItems: "center", borderColor: "rgba(255,181,71,.35)" }}>
                <Icon name="signal" /><span className="grow"><b>{m.title}</b><br /><span className="small muted">Reçu le {new Date(m.receivedAt).toLocaleDateString("fr-FR")}</span></span>
                {p.missions[m.id] ? <span className="pill led">Traité</span> : <span className="pill amber">Nouveau</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {r.project && <ProjectCard r={r} />}

      <button className="btn ghost block" style={{ marginTop: 18 }} onClick={() => exportRoomFiche(r, getState().progress)}>
        <Icon name="share" size={18} /> Exporter la fiche de la salle
      </button>
      {roomComplete(p, r) && <div className="small dim" style={{ textAlign: "center", marginTop: 10 }}>Salle en ligne. Les notions continuent de vivre en Maintenance.</div>}
    </div>
  );
}

function RackIcon({ state, hue }: { state: "done" | "open" | "locked"; hue: number }) {
  const c = state === "done" ? "#4dffa0" : state === "open" ? `hsl(${hue} 100% 62%)` : "#2a3550";
  return (
    <svg width="34" height="40" viewBox="0 0 34 40" aria-hidden="true">
      <rect x="2" y="2" width="30" height="36" rx="5" fill="#0b1222" stroke={c} strokeOpacity=".6" />
      {[0, 1, 2, 3].map((k) => (
        <g key={k}><rect x="7" y={8 + k * 7} width="20" height="4" rx="1.5" fill="#152038" />
          <rect x="22" y={9 + k * 7} width="3" height="2" fill={c} style={state !== "locked" ? { animation: `blink ${0.6 + k * 0.4}s steps(1) infinite` } : undefined} /></g>
      ))}
    </svg>
  );
}

function ProjectCard({ r }: { r: Room }) {
  const p = useProgress();
  const pr = r.project!;
  const key = (i: number) => `proj:${r.id}:${i}`;
  const doneCount = pr.steps.filter((_s, i) => p.checks?.[key(i)]).length;
  return (
    <div className="panel" style={{ marginTop: 20, borderColor: "rgba(167,139,250,.35)", background: "rgba(167,139,250,.06)" }}>
      <div className="panel-title" style={{ color: "var(--violet)" }}>🌙 Mini-projet du soir · {doneCount}/{pr.steps.length}</div>
      <div className="h3">{pr.title}</div>
      <div className="small muted" style={{ marginBottom: 10 }}>{pr.goal}</div>
      {pr.steps.map((s, i) => {
        const on = !!p.checks?.[key(i)];
        return (
          <button key={i} className={`choice ${on ? "ok" : ""}`} onClick={() => {
            sfx(on ? "tap" : "ok");
            updateProgress((d) => { d.checks = { ...(d.checks ?? {}), [key(i)]: !on }; });
            const all = pr.steps.every((_x, k) => (k === i ? !on : getState().progress.checks?.[key(k)]));
            if (all && !getState().progress.checks?.[`proj:${r.id}:done`]) {
              updateProgress((d) => { d.checks[`proj:${r.id}:done`] = true; });
              addEnergy(50, "mini-projet terminé");
            }
          }}>
            <span className="key">{on ? "✓" : i + 1}</span><span>{s}</span>
          </button>
        );
      })}
      <div className="small" style={{ marginTop: 10 }}><b>Réussi si :</b> {pr.success.join(" ")}</div>
    </div>
  );
}

// ======================= Étape (leçon) =======================
export function StepView({ roomId, stepId }: { roomId: string; stepId: string }) {
  const r = getRoom(roomId);
  const p = useProgress();
  const idx = r ? r.steps.findIndex((s) => s.id === stepId) : -1;
  const step = r?.steps[idx];
  const key = r && step ? stepKey(r.id, step.id) : "";
  const wasDone = !!p.steps[key];
  const [revealed, setRevealed] = useState(() => (wasDone ? 999 : 1));
  const [solved, setSolved] = useState<Record<number, boolean>>({});
  const [finished, setFinished] = useState<null | { energy: number }>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const earned = useRef(0);

  useEffect(() => { if (revealed > 1 && revealed < 999) setTimeout(() => bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 60); }, [revealed]);
  useEffect(() => { if (finished) setTimeout(() => bottom.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 250); }, [finished]);

  const blocks = useMemo(() => step?.blocks ?? [], [step]);
  if (!r || !step) return <div className="wrap"><p>Étape introuvable.</p></div>;
  if (!stepUnlocked(p, r, idx)) return <div className="wrap"><TopBar title={step.title} onBack={() => go(`salle/${r.id}`)} /><OraSays mood="alert" md="Cette baie n'est pas encore alimentée. Termine la précédente." /></div>;

  const visible = blocks.slice(0, revealed);
  const last = visible[visible.length - 1];
  const lastIdx = visible.length - 1;
  const blockedByExercise = last?.type === "exercise" && !solved[lastIdx] && !wasDone;
  const atEnd = revealed >= blocks.length;
  const pct = Math.min(100, Math.round((Math.min(revealed, blocks.length) / blocks.length) * 100));

  const onSolved = (bi: number) => (attempts: number) => {
    setSolved((s) => ({ ...s, [bi]: true }));
    const exKey = `${key}#${bi}`;
    if (getState().progress.exercises[exKey] === undefined) {
      updateProgress((d) => { d.exercises[exKey] = attempts; });
      const e = attempts <= 1 ? REWARD.exerciseFirst : REWARD.exerciseRetry;
      earned.current += e;
      addEnergy(e);
    }
  };

  const complete = () => {
    const first = !getState().progress.steps[key];
    if (first) {
      updateProgress((d) => { d.steps[key] = today(); });
      learnNotions(step.introduces, r.id);
      addEnergy(REWARD.step, "baie rallumée");
      earned.current += REWARD.step;
    }
    sfx("power");
    fx({ type: "burst", color: `hsl(${r.hue} 100% 62%)` });
    checkBadges();
    setFinished({ energy: earned.current });
  };

  const next = r.steps[idx + 1];
  return (
    <div className="wrap" style={{ ["--hue" as string]: r.hue }}>
      <TopBar title={step.title} kicker={`${r.code} · Baie ${String(idx + 1).padStart(2, "0")}`} onBack={() => go(`salle/${r.id}`)} />
      <div className="progress" style={{ marginBottom: 18 }}><motion.i animate={{ width: `${pct}%` }} /></div>
      <div className="muted" style={{ fontSize: 17, marginBottom: 18, fontStyle: "italic" }}>{step.kicker}</div>
      <div className="stack" style={{ gap: 14 }}>
        <AnimatePresence initial={false}>
          {visible.map((b, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 24, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }} style={{ marginTop: 14 }}>
              <BlockView block={b} exKey={`${key}#${i}`} solvedBefore={getState().progress.exercises[`${key}#${i}`] !== undefined} onSolved={onSolved(i)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div ref={bottom} style={{ marginTop: 22 }}>
        {!finished && !atEnd && (
          <motion.button className="btn block" whileTap={{ scale: 0.97 }} disabled={blockedByExercise} onClick={() => { sfx("tap"); setRevealed((v) => v + 1); }}>
            {blockedByExercise ? "Réussis la vérification pour continuer" : "Continuer ▸"}
          </motion.button>
        )}
        {!finished && atEnd && (
          <motion.button className="btn block led" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} whileTap={{ scale: 0.97 }} disabled={blockedByExercise} onClick={complete}>
            ⚡ {wasDone ? "Relancer la baie" : "Rallumer la baie"}
          </motion.button>
        )}
        <AnimatePresence>
          {finished && (
            <motion.div className="panel glow" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}
              style={{ textAlign: "center", borderColor: "rgba(77,255,160,.5)", background: "radial-gradient(circle at 50% 0%, rgba(77,255,160,.18), rgba(12,19,34,.95) 70%)" }}>
              <div style={{ fontSize: 42 }}>⚡</div>
              <div className="h2">Baie {String(idx + 1).padStart(2, "0")} en ligne</div>
              {finished.energy > 0 && <div className="mono" style={{ color: "var(--cyan)", fontSize: 20, margin: "6px 0 10px" }}>+{finished.energy} kW</div>}
              {step.introduces.length > 0 && (
                <>
                  <div className="small muted" style={{ marginBottom: 8 }}>Notions ajoutées à ta Base de connaissances :</div>
                  <div className="row wrap-row" style={{ justifyContent: "center", gap: 6, marginBottom: 14 }}>
                    {step.introduces.map((n) => <span key={n} className="pill cyan">{notion(n)?.icon} {notion(n)?.term}</span>)}
                  </div>
                </>
              )}
              <div className="stack">
                {next ? <button className="btn block" onClick={() => { setFinished(null); go(`salle/${r.id}/${next.id}`); }}>Baie suivante : {next.title}</button>
                  : r.incident && !p.incidents[r.id] ? <button className="btn block danger" onClick={() => { sfx("alarm"); go(`incident/${r.id}`); }}>🚨 Affronter l'incident</button>
                  : <button className="btn block" onClick={() => go("")}>Retour à la carte</button>}
                <button className="btn ghost block" onClick={() => go(`salle/${r.id}`)}>Retour à la salle</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ======================= Incident =======================
export function IncidentView({ roomId }: { roomId: string }) {
  const r = getRoom(roomId);
  const p = useProgress();
  const [i, setI] = useState(0);
  const [fuses, setFuses] = useState(3);
  const [picked, setPicked] = useState<number[]>([]);
  const [state, setState] = useState<"play" | "won" | "lost">("play");
  const [shake, setShake] = useState(false);
  const order = useMemo(() => r?.incident?.scenarios.map((s) => [...s.options].sort(() => Math.random() - 0.5)) ?? [], [r]);
  if (!r?.incident) return <div className="wrap"><p>Aucun incident ici.</p></div>;
  if (roomStepsDone(p, r) < r.steps.length) return <div className="wrap"><TopBar title={r.incident.title} onBack={() => go(`salle/${r.id}`)} /><OraSays mood="alert" md="Rallume d'abord toutes les baies de la salle." /></div>;
  const sc = r.incident.scenarios[i];
  const opts = order[i];
  const solvedNow = picked.some((k) => opts[k].ok);
  const last = picked[picked.length - 1];

  const pick = (k: number, e: React.MouseEvent) => {
    if (solvedNow || picked.includes(k) || state !== "play") return;
    const np = [...picked, k]; setPicked(np);
    if (opts[k].ok) { sfx("ok"); fx({ type: "burst", x: e.clientX, y: e.clientY, color: "#4dffa0" }); }
    else {
      sfx("alarm"); setShake(true); setTimeout(() => setShake(false), 500);
      const f = fuses - 1; setFuses(f);
      if (f <= 0) setTimeout(() => setState("lost"), 900);
    }
  };
  const nextScenario = () => {
    if (i + 1 < r.incident!.scenarios.length) { setI(i + 1); setPicked([]); sfx("tap"); return; }
    const first = !getState().progress.incidents[r.id];
    updateProgress((d) => { d.incidents[r.id] = { at: today(), fusesLeft: Math.max(fuses, d.incidents[r.id]?.fusesLeft ?? 0) }; });
    if (first) addEnergy(REWARD.incident, "incident résolu");
    sfx("power"); fx({ type: "burst", color: `hsl(${r.hue} 100% 62%)` }); checkBadges();
    setState("won");
  };
  const restart = () => { setI(0); setFuses(3); setPicked([]); setState("play"); sfx("power"); };

  return (
    <div className="wrap">
      <TopBar title={r.incident.title} kicker={`${r.code} · Incident critique`} onBack={() => go(`salle/${r.id}`)} />
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
        <div className="row" style={{ gap: 8 }}>
          <span style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--red)", boxShadow: "0 0 18px var(--red)", animation: state === "play" ? "blink .8s steps(1) infinite" : undefined }} />
          <span className="mono small" style={{ color: "var(--red)" }}>ALERTE {i + 1}/{r.incident.scenarios.length}</span>
        </div>
        <div className="row" style={{ gap: 6 }} aria-label={`${fuses} fusibles restants`}>
          {[0, 1, 2].map((k) => (
            <motion.span key={k} animate={{ opacity: k < fuses ? 1 : 0.2, scale: k < fuses ? 1 : 0.8 }}
              style={{ width: 16, height: 26, borderRadius: 4, border: "2px solid var(--amber)", background: k < fuses ? "linear-gradient(#ffd27a, #ffb547)" : "#1a1a1a", boxShadow: k < fuses ? "0 0 10px rgba(255,181,71,.6)" : "none" }} />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {state === "play" && (
          <motion.div key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className={shake ? "shake" : ""}>
            <div className="panel" style={{ borderColor: "rgba(255,77,109,.5)", background: "linear-gradient(140deg, rgba(255,77,109,.16), rgba(12,19,34,.9))" }}>
              <div className="panel-title" style={{ color: "var(--red)" }}>🚨 Message d'alerte</div>
              <div style={{ fontSize: 17 }}>{sc.alert}</div>
            </div>
            <div className="h3" style={{ margin: "16px 0 10px" }}>{sc.q}</div>
            {opts.map((o, k) => {
              const st = picked.includes(k) ? (o.ok ? "ok" : "ko") : "";
              return <button key={k} className={`choice ${st}`} onClick={(e) => pick(k, e)} disabled={solvedNow && !picked.includes(k)}><span className="key">{st === "ok" ? "✓" : st === "ko" ? "✕" : "ABC"[k]}</span><span>{o.t}</span></button>;
            })}
            {last !== undefined && (
              <motion.div key={last} className={`feedback ${opts[last].ok ? "ok" : "ko"}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <span className="tag">{opts[last].ok ? "Diagnostic correct" : "Fusible grillé"}</span>
                <BlockView block={{ type: "text", md: opts[last].why }} exKey="" solvedBefore={false} onSolved={() => {}} />
              </motion.div>
            )}
            {solvedNow && <button className="btn block" style={{ marginTop: 14 }} onClick={nextScenario}>{i + 1 < r.incident.scenarios.length ? "Alerte suivante ▸" : "Rétablir le courant ⚡"}</button>}
          </motion.div>
        )}
        {state === "lost" && (
          <motion.div key="lost" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <OraSays mood="alert" md="**Disjonction !** Les trois fusibles ont grillé. Pas de panique : relis les explications ci-dessus ou la Base de connaissances, puis réarme le tableau." />
            <button className="btn block" style={{ marginTop: 16 }} onClick={restart}>Réarmer et recommencer</button>
            <button className="btn ghost block" style={{ marginTop: 10 }} onClick={() => go("base")}>Revoir la Base de connaissances</button>
          </motion.div>
        )}
        {state === "won" && (
          <motion.div key="won" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="panel glow" style={{ textAlign: "center", borderColor: "rgba(77,255,160,.5)" }}>
            <div style={{ fontSize: 46 }}>🧯</div>
            <div className="h2">Incident maîtrisé</div>
            <div className="muted" style={{ marginBottom: 14 }}>{fuses === 3 ? "Sans un seul fusible grillé. Impressionnant." : `Avec ${fuses} fusible${fuses > 1 ? "s" : ""} restant${fuses > 1 ? "s" : ""}.`} La {r.code} est entièrement en ligne.</div>
            <button className="btn block" onClick={() => go("")}>Retour à la carte</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
