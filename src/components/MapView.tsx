import { motion } from "motion/react";
import { ROOMS, stepKey } from "../content";
import type { Room } from "../content/types";
import { dueNotions, fx } from "../lib/game";
import { currentRoom, roomComplete, roomPower, roomUnlocked, totalPower } from "../lib/progress";
import { go } from "../lib/router";
import { sfx } from "../lib/sound";
import { useProgress } from "../lib/store";
import { useMissions } from "../lib/data";
import { Icon } from "./Icon";
import { OraSays } from "./Ora";

const ROW = 200;

export function MapView() {
  const p = useProgress();
  const { missions } = useMissions();
  const cur = currentRoom(p);
  const power = totalPower(p);
  const due = new Set(dueNotions(p));
  const pendingSignals = missions.filter((m) => !p.missions[m.id]);
  const nextStep = cur.steps.find((s) => !p.steps[stepKey(cur.id, s.id)]);
  const height = ROOMS.length * ROW + 40;

  const greet = !Object.keys(p.steps).length
    ? `Le courant arrive dans le Hall${p.name ? `, ${p.name}` : ""}. Commence par la **Salle 00** : trois notions de base, et le premier secteur s'allume.`
    : roomComplete(p, ROOMS[ROOMS.length - 1])
      ? "Tout le datacenter est en ligne. Reviens chaque jour pour la **maintenance** : c'est elle qui ancre tes connaissances."
      : `Prochaine étape : **${cur.code} · ${cur.name}**.${due.size ? ` Et ${due.size} notion${due.size > 1 ? "s" : ""} surchauffe${due.size > 1 ? "nt" : ""} : passe en maintenance.` : ""}`;

  return (
    <div className="wrap">
      <div className="panel glow" style={{ ["--hue" as string]: 190, display: "flex", gap: 16, alignItems: "center" }}>
        <PowerRing value={power} />
        <div className="grow">
          <div className="kicker">Datacenter FORMA-7</div>
          <div className="h2" style={{ margin: "2px 0 4px", fontSize: 19, whiteSpace: "nowrap" }}>Alimentation {power}&nbsp;%</div>
          <div className="small muted">{ROOMS.filter((r) => r.day <= 7 && roomComplete(p, r)).length} / {ROOMS.filter((r) => r.day <= 7).length} salles du programme en ligne</div>
        </div>
        <button className="icon-btn" style={{ alignSelf: "flex-start", color: pendingSignals.length ? "var(--amber)" : undefined, position: "relative" }} onClick={() => { sfx("tap"); go("signaux"); }} aria-label="Signaux reçus">
          <Icon name="signal" size={20} />
          {pendingSignals.length > 0 && <span style={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, background: "var(--amber)", color: "#1a1000", font: "700 10px/16px var(--mono)", textAlign: "center" }}>{pendingSignals.length}</span>}
        </button>
      </div>

      <div style={{ margin: "16px 0" }}><OraSays compact md={greet} mood={due.size ? "alert" : "happy"} /></div>

      {nextStep && roomUnlocked(p, cur) && (
        <motion.button className="btn block" style={{ ["--hue" as string]: cur.hue, marginBottom: 12 }} whileTap={{ scale: 0.97 }}
          onClick={() => { sfx("open"); go(`salle/${cur.id}/${nextStep.id}`); }}>
          <Icon name="play" size={18} /> Continuer · {cur.code} · {nextStep.title}
        </motion.button>
      )}

      {pendingSignals.slice(0, 2).map((m) => (
        <motion.button key={m.id} className="panel row" whileTap={{ scale: 0.98 }} onClick={() => go(`signal/${m.id}`)}
          style={{ width: "100%", textAlign: "left", marginBottom: 10, borderColor: "rgba(255,181,71,.45)", background: "linear-gradient(90deg, rgba(255,181,71,.12), rgba(12,19,34,.8))" }}>
          <span style={{ position: "relative", width: 36, height: 36, display: "grid", placeItems: "center", color: "var(--amber)" }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid var(--amber)", animation: "pulse-ring 1.8s infinite" }} />
            <Icon name="signal" />
          </span>
          <span className="grow">
            <span className="kicker" style={{ color: "var(--amber)" }}>Signal reçu · Jour {m.day || "+"}</span>
            <span style={{ display: "block", fontWeight: 700 }}>{m.title}</span>
          </span>
          <Icon name="back" size={18} className="flip" />
        </motion.button>
      ))}

      <div style={{ position: "relative", height, marginTop: 8 }}>
        <Cables p={p} />
        {ROOMS.map((r, i) => {
          const left = i % 2 === 0;
          const unlocked = roomUnlocked(p, r);
          const done = roomComplete(p, r);
          const hot = r.steps.some((s) => s.introduces.some((n) => due.has(n)));
          return (
            <RoomTile key={r.id} room={r} i={i} left={left} unlocked={unlocked} done={done} current={r.id === cur.id && unlocked && !done}
              power={roomPower(p, r)} hot={hot}
              onClick={() => {
                if (!unlocked) {
                  sfx("ko");
                  const req = ROOMS.find((x) => x.id === r.requires[0]);
                  fx({ type: "toast", icon: "🔒", text: `Verrouillée : rallume d'abord ${req ? req.code : "la salle précédente"}`, tone: "red" });
                  return;
                }
                sfx("open");
                go(`salle/${r.id}`);
              }} />
          );
        })}
      </div>
    </div>
  );
}

function PowerRing({ value }: { value: number }) {
  const R = 30, C = 2 * Math.PI * R;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" aria-label={`Alimentation ${value} %`}>
      <circle cx="38" cy="38" r={R} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="7" />
      <motion.circle cx="38" cy="38" r={R} fill="none" stroke="var(--cyan)" strokeWidth="7" strokeLinecap="round" transform="rotate(-90 38 38)"
        strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - value / 100) }} transition={{ duration: 1.2, ease: "easeOut" }}
        style={{ filter: "drop-shadow(0 0 6px var(--cyan))" }} />
      <text x="38" y="43" textAnchor="middle" fill="#e7f0ff" style={{ font: "700 16px var(--mono)" }}>{value}%</text>
    </svg>
  );
}

function Cables({ p }: { p: ReturnType<typeof useProgress> }) {
  const H = ROOMS.length * ROW + 40;
  return (
    <svg width="100%" height={H} viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }} aria-hidden="true">
      {ROOMS.slice(0, -1).map((r, i) => {
        const x1 = i % 2 === 0 ? 28 : 72, x2 = i % 2 === 0 ? 72 : 28;
        const y1 = i * ROW + 92, y2 = (i + 1) * ROW + 92;
        const d = `M ${x1} ${y1} C ${x1} ${y1 + 110}, ${x2} ${y2 - 110}, ${x2} ${y2}`;
        const live = roomComplete(p, r);
        const next = ROOMS[i + 1];
        return (
          <g key={r.id}>
            <path d={d} fill="none" stroke="#0a1120" strokeWidth="9" vectorEffect="non-scaling-stroke" />
            <path d={d} fill="none" stroke={live ? `hsl(${next.hue} 100% 62%)` : "rgba(125,200,255,.1)"} strokeWidth={live ? 3 : 2} vectorEffect="non-scaling-stroke"
              strokeDasharray={live ? "8 12" : "3 9"} style={live ? { animation: "dash 1.2s linear infinite", filter: `drop-shadow(0 0 4px hsl(${next.hue} 100% 62%))` } : undefined} />
          </g>
        );
      })}
    </svg>
  );
}

function RoomTile({ room: r, i, left, unlocked, done, current, power, hot, onClick }: {
  room: Room; i: number; left: boolean; unlocked: boolean; done: boolean; current: boolean; power: number; hot: boolean; onClick: () => void;
}) {
  const h = r.hue;
  const top = done ? `hsl(${h} 70% 42%)` : unlocked ? `hsl(${h} 45% 22%)` : "#0e1627";
  const sideL = done ? `hsl(${h} 70% 28%)` : unlocked ? `hsl(${h} 40% 14%)` : "#0a101d";
  const sideR = done ? `hsl(${h} 70% 20%)` : unlocked ? `hsl(${h} 40% 10%)` : "#070c17";
  const accent = `hsl(${h} 100% 64%)`;
  return (
    <motion.button type="button" onClick={onClick} aria-label={`${r.code} ${r.name}${unlocked ? "" : " (verrouillée)"}`}
      initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.5, delay: 0.05 }}
      whileTap={{ scale: 0.95 }}
      style={{ position: "absolute", top: i * ROW, left: left ? "28%" : "72%", width: 168, marginLeft: -84, textAlign: "center" }}>
      <div style={{ position: "relative", width: 168, height: 130 }}>
        {current && <span style={{ position: "absolute", left: 34, top: 18, width: 100, height: 100, borderRadius: "50%", border: `2px solid ${accent}`, animation: "pulse-ring 2s infinite" }} />}
        <svg width="168" height="130" viewBox="0 0 168 130" style={{ overflow: "visible", filter: done ? `drop-shadow(0 0 16px hsl(${h} 100% 55% / .55))` : current ? `drop-shadow(0 0 10px hsl(${h} 100% 55% / .35))` : undefined }}>
          {/* dalle isométrique */}
          <polygon points="84,22 158,58 84,94 10,58" fill={top} stroke={unlocked ? accent : "rgba(255,255,255,.08)"} strokeOpacity={done ? 0.9 : 0.5} />
          <polygon points="10,58 84,94 84,118 10,82" fill={sideL} />
          <polygon points="158,58 84,94 84,118 158,82" fill={sideR} />
          {/* baies de serveurs */}
          {[[56, 52], [84, 66], [112, 52], [84, 38]].map(([x, y], k) => (
            <g key={k} transform={`translate(${x - 12} ${y - 30})`}>
              <polygon points="12,0 24,6 12,12 0,6" fill={done ? "#1d2a44" : "#111a2c"} />
              <polygon points="0,6 12,12 12,36 0,30" fill={done ? "#152036" : "#0b1322"} />
              <polygon points="24,6 12,12 12,36 24,30" fill={done ? "#0f1828" : "#080e1a"} />
              {[0, 1, 2, 3].map((l) => (
                <rect key={l} x={3} y={12 + l * 5} width="2.2" height="1.6" transform="skewY(26)"
                  fill={done ? (l % 2 ? "#4dffa0" : accent) : unlocked && l === 0 ? accent : "#1f2b40"}
                  style={done ? { animation: `blink ${0.8 + ((k + l) % 4) * 0.37}s steps(1) infinite` } : current && l === 0 ? { animation: "flicker 3s infinite" } : undefined} />
              ))}
            </g>
          ))}
          {!unlocked && (
            <g transform="translate(72 44)" opacity=".75">
              <rect x="2" y="10" width="20" height="16" rx="3" fill="#1a2438" stroke="#3a4a66" />
              <path d="M6 10V7a6 6 0 0 1 12 0v3" fill="none" stroke="#3a4a66" strokeWidth="2.4" />
            </g>
          )}
          {hot && unlocked && <circle cx="150" cy="30" r="7" fill="var(--red)" style={{ animation: "blink 1s steps(1) infinite" }} />}
        </svg>
      </div>
      <div className="mono" style={{ fontSize: 10.5, letterSpacing: ".14em", color: unlocked ? accent : "var(--text-3)" }}>{r.code} · {done ? "EN LIGNE" : unlocked ? `${power} %` : "ÉTEINTE"}</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: unlocked ? "var(--text)" : "var(--text-3)", lineHeight: 1.2, marginTop: 2 }}>{r.name}</div>
      <div className="small" style={{ color: "var(--text-3)", marginTop: 2 }}>{r.day >= 1 && r.day <= 7 ? `Jour ${r.day}` : r.day === 0 ? "Fondations" : "Bonus"}</div>
    </motion.button>
  );
}
