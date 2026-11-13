import { useRef, useState } from "react";
import { MODELS, loadClaude } from "../lib/models";
import { syncMissions, testGithub, useMissions } from "../lib/data";
import { deviceLabel, syncNow, useSyncState } from "../lib/sync";
import { saveFile } from "../lib/share";
import { sfx } from "../lib/sound";
import { DEFAULT_PROGRESS, getState, replaceProgress, updateProgress, updateSettings, useProgress, useSettings, type Progress } from "../lib/store";
import { TopBar } from "./Chrome";
import { Icon } from "./Icon";

export function SettingsView() {
  const s = useSettings();
  const p = useProgress();
  const data = useMissions();
  const sync = useSyncState();
  const [showTok, setShowTok] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [gh, setGh] = useState<{ loading?: boolean; ok?: string; err?: string }>({});
  const [cl, setCl] = useState<{ loading?: boolean; ok?: string; err?: string }>({});
  const file = useRef<HTMLInputElement>(null);

  const testGh = async () => {
    setGh({ loading: true });
    try { const msg = await testGithub(); setGh({ ok: msg }); sfx("ok"); syncMissions(); }
    catch (e) { setGh({ err: e instanceof Error ? e.message : String(e) }); sfx("ko"); }
  };
  const testCl = async () => {
    setCl({ loading: true });
    try { const { testKey } = await loadClaude(); setCl({ ok: await testKey() }); sfx("ok"); }
    catch (e) { setCl({ err: e instanceof Error ? e.message : String(e) }); sfx("ko"); }
  };
  const exportBackup = async () => {
    await saveFile(`forma-7-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(getState().progress, null, 2), "application/json");
  };
  const importBackup = async (f: File) => {
    try {
      const json = JSON.parse(await f.text()) as Progress;
      if (json.version !== 1 || typeof json.energy !== "number") throw new Error("Fichier non reconnu");
      if (!confirm("Remplacer ta progression actuelle par cette sauvegarde ?")) return;
      replaceProgress(json); sfx("power");
      alert(getState().settings.syncEnabled ? "Sauvegarde restaurée. Elle sera aussi appliquée à tes autres appareils synchronisés." : "Sauvegarde restaurée.");
    } catch (e) { alert(`Import impossible : ${e instanceof Error ? e.message : e}`); }
  };

  return (
    <div className="wrap">
      <TopBar title="Réglages" kicker="Salle des machines" />

      <Section title="Profil & confort">
        <label className="field"><span>Ton prénom</span><input className="input" value={p.name} maxLength={24} onChange={(e) => updateProgress((d) => { d.name = e.target.value; })} /></label>
        <Toggle label="Effets sonores" on={s.sound} onChange={(v) => { updateSettings({ sound: v }); if (v) setTimeout(() => sfx("ok"), 50); }} />
        <label className="field" style={{ marginTop: 12 }}><span>Animations</span>
          <select className="input" value={s.reduceMotion} onChange={(e) => updateSettings({ reduceMotion: e.target.value as typeof s.reduceMotion })}>
            <option value="auto">Selon le réglage de l'iPhone</option>
            <option value="off">Complètes</option>
            <option value="on">Réduites</option>
          </select>
        </label>
      </Section>

      <Section title="📡 Flux de données (missions privées)">
        <p className="small muted">Chaque matin, Claude transforme le mail de la formation en mission et la range dans ton dépôt GitHub <b>privé</b>. L'appli la lit grâce à un <b>jeton d'accès</b> limité à ce dépôt, stocké uniquement sur cet appareil.</p>
        <div className="row">
          <label className="field grow"><span>Compte GitHub</span><input className="input mono" value={s.ghOwner} onChange={(e) => updateSettings({ ghOwner: e.target.value.trim() })} autoCapitalize="off" autoCorrect="off" /></label>
          <label className="field grow"><span>Dépôt</span><input className="input mono" value={s.ghRepo} onChange={(e) => updateSettings({ ghRepo: e.target.value.trim() })} autoCapitalize="off" autoCorrect="off" /></label>
        </div>
        <label className="field"><span>Jeton d'accès GitHub</span>
          <div className="row">
            <input className="input mono" type={showTok ? "text" : "password"} value={s.ghToken} placeholder="github_pat_…" onChange={(e) => updateSettings({ ghToken: e.target.value.trim() })} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
            <button className="icon-btn" style={{ flex: "none" }} onClick={() => setShowTok(!showTok)} aria-label="Afficher le jeton"><Icon name="eye" size={18} /></button>
          </div>
        </label>
        <div className="row">
          <button className="btn small grow" disabled={!s.ghToken || gh.loading} onClick={testGh}>{gh.loading ? "Test…" : "Tester la connexion"}</button>
          <button className="btn small subtle" disabled={!s.ghToken || data.status === "loading"} onClick={() => syncMissions()}><Icon name="refresh" size={16} /> Synchroniser</button>
        </div>
        {gh.ok && <div className="feedback ok">{gh.ok}</div>}
        {gh.err && <div className="feedback ko">{gh.err}</div>}
        {data.status === "error" && !gh.err && <div className="feedback ko">{data.error}</div>}
        <div className="small dim" style={{ marginTop: 8 }}>{data.missions.length} mission(s) en cache{data.fetchedAt ? ` · synchro ${new Date(data.fetchedAt).toLocaleString("fr-FR")}` : ""}</div>
        <details style={{ marginTop: 12 }}>
          <summary className="small" style={{ color: "var(--cyan)", cursor: "pointer" }}>Créer le jeton, pas à pas</summary>
          <ol className="small" style={{ paddingLeft: 18, lineHeight: 1.6 }}>
            <li>Sur github.com : photo de profil › <b>Settings</b> › <b>Developer settings</b> › <b>Personal access tokens</b> › <b>Fine-grained tokens</b> › <b>Generate new token</b>.</li>
            <li>Nom : « FORMA-7 ». Expiration : 90 jours (tu le renouvelleras). Tu peux coller le même jeton sur l'iPhone et l'iPad.</li>
            <li><b>Repository access</b> : « Only select repositories » › <b>FORMA-7-data</b> uniquement.</li>
            <li><b>Permissions › Repository permissions › Contents</b> : <b>Read and write</b> si tu veux synchroniser ta progression entre appareils, sinon <b>Read-only</b>. Rien d'autre.</li>
            <li>Génère, copie le jeton, colle-le ici, puis « Tester la connexion ».</li>
          </ol>
          <p className="small muted">Les menus de GitHub peuvent changer légèrement de nom. Ne colle jamais ce jeton ailleurs que dans ce champ.</p>
        </details>
      </Section>

      <Section title="⚡ Claude dans l'appli (optionnel)">
        <p className="small muted">Avec ta propre clé API, Claude corrige tes réponses « avec tes mots », réexplique une notion autrement, et teste tes prompts et tes Skills. Sans clé, tout le reste fonctionne.</p>
        <label className="field"><span>Clé API Claude</span>
          <div className="row">
            <input className="input mono" type={showKey ? "text" : "password"} value={s.apiKey} placeholder="sk-ant-…" onChange={(e) => updateSettings({ apiKey: e.target.value.trim() })} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
            <button className="icon-btn" style={{ flex: "none" }} onClick={() => setShowKey(!showKey)} aria-label="Afficher la clé"><Icon name="eye" size={18} /></button>
          </div>
        </label>
        <label className="field"><span>Modèle</span>
          <select className="input" value={s.model} onChange={(e) => updateSettings({ model: e.target.value })}>
            {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
        <button className="btn small block" disabled={!s.apiKey || cl.loading} onClick={testCl}>{cl.loading ? "Test…" : "Tester la clé"}</button>
        {cl.ok && <div className="feedback ok"><span className="tag">Claude répond</span>{cl.ok}</div>}
        {cl.err && <div className="feedback ko">{cl.err}</div>}
        <details style={{ marginTop: 12 }}>
          <summary className="small" style={{ color: "var(--cyan)", cursor: "pointer" }}>Obtenir une clé et maîtriser le coût</summary>
          <ol className="small" style={{ paddingLeft: 18, lineHeight: 1.6 }}>
            <li>Va sur <b>console.anthropic.com</b>, crée un compte et ajoute un petit crédit (l'API est payante à l'usage, séparément de l'abonnement claude.ai).</li>
            <li>Dans <b>API keys</b>, crée une clé « FORMA-7 », copie-la ici.</li>
            <li>Fixe une <b>limite de dépense mensuelle</b> basse dans la console.</li>
          </ol>
          <p className="small muted">Coût indicatif (à vérifier sur ta console) : une correction coûte en général quelques centimes avec Opus, moins avec Sonnet ou Haiku. La clé reste sur cet appareil et n'est envoyée qu'à l'API d'Anthropic.</p>
        </details>
      </Section>

      <Section title="🔄 Synchronisation entre appareils">
        <p className="small muted">Retrouve ta progression sur ton iPhone et ton iPad. Elle est enregistrée dans ton dépôt privé (fichier <code>progress/progress.json</code>), à l'ouverture de l'appli, environ 30 secondes après chaque progrès, et quand tu la quittes. Si tu avances sur deux appareils sans connexion, tout est fusionné : rien n'est perdu.</p>
        <Toggle label="Synchroniser ma progression" on={s.syncEnabled} onChange={(v) => { if (v && !s.ghToken) { alert("Colle d'abord ton jeton GitHub dans « Flux de données » ci-dessus (droits Contents : Read and write)."); return; } updateSettings({ syncEnabled: v }); }} />
        <div className="small" style={{ marginTop: 8, color: sync.status === "error" ? "var(--red)" : "var(--text-2)" }}>
          {!s.syncEnabled ? "Désactivée sur cet appareil." : sync.status === "syncing" ? "Synchronisation en cours…" : sync.status === "error" ? sync.error : sync.lastSyncAt ? `Synchronisé le ${new Date(sync.lastSyncAt).toLocaleString("fr-FR")}.` : "En attente de la première synchronisation."}
        </div>
        {s.syncEnabled && <button className="btn small subtle block" style={{ marginTop: 10 }} disabled={sync.status === "syncing"} onClick={() => syncNow()}><Icon name="refresh" size={16} /> Synchroniser maintenant</button>}
        <div className="small dim" style={{ marginTop: 8 }}>Cet appareil : {deviceLabel()} · {s.deviceId.slice(0, 8)}. Active la synchronisation sur chaque appareil, avec le même jeton.</div>
      </Section>

      <Section title="💾 Sauvegarde">
        <p className="small muted">Ta progression est stockée sur cet appareil{s.syncEnabled ? " et synchronisée dans ton dépôt privé" : ""}. Le fichier de sauvegarde contient ta progression, mais jamais ton jeton ni ta clé API.{s.syncEnabled ? "" : " iOS peut, rarement, effacer les données d'un site : exporte une sauvegarde de temps en temps, ou active la synchronisation."}</p>
        <div className="row">
          <button className="btn small subtle grow" onClick={exportBackup}><Icon name="share" size={16} /> Exporter</button>
          <button className="btn small subtle grow" onClick={() => file.current?.click()}>Importer</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importBackup(f); e.target.value = ""; }} />
        </div>
        <button className="btn small ghost block" style={{ marginTop: 10, color: "var(--red)" }} onClick={() => { if (confirm(s.syncEnabled ? "Tout réinitialiser ? Ta progression sera effacée sur CET appareil ET sur tes autres appareils synchronisés (pense à exporter avant)." : "Tout réinitialiser ? Ta progression sera effacée (pense à exporter avant).")) { replaceProgress(DEFAULT_PROGRESS); setTimeout(async () => { await syncNow(); location.hash = "#/"; location.reload(); }, 400); } }}>Réinitialiser la progression</button>
      </Section>

      <Section title="📱 Installer sur l'iPhone ou l'iPad">
        <ol className="small" style={{ paddingLeft: 18, lineHeight: 1.7, margin: 0 }}>
          <li>Ouvre ce site dans <b>Safari</b>.</li>
          <li>Touche le bouton <b>Partager</b> (carré avec une flèche).</li>
          <li>Choisis <b>« Sur l'écran d'accueil »</b>, puis <b>Ajouter</b>.</li>
          <li>Lance FORMA-7 depuis son icône : plein écran, et utilisable hors ligne.</li>
        </ol>
      </Section>

      <Section title="ℹ️ À propos">
        <p className="small muted" style={{ margin: 0 }}>
          FORMA-7 accompagne « La roadmap 7 jours » de Humains Augmentés. Application personnelle et indépendante, non affiliée à Humains Augmentés, Anthropic, OpenAI ou Google.
          Le contenu de base est original ; les informations sur les produits (prix, fonctions) ont été vérifiées en novembre 2026 et peuvent avoir changé.
          Claude, ChatGPT, Gemini, Gmail et GitHub sont des marques de leurs propriétaires respectifs.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="panel" style={{ marginTop: 14 }}><div className="panel-title">{title}</div>{children}</section>;
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="row" style={{ width: "100%", padding: "6px 0" }} onClick={() => onChange(!on)} role="switch" aria-checked={on}>
      <span className="grow" style={{ textAlign: "left" }}>{label}</span>
      <span style={{ width: 50, height: 30, borderRadius: 15, padding: 3, background: on ? "var(--cyan)" : "#253250", transition: "background .2s" }}>
        <span style={{ display: "block", width: 24, height: 24, borderRadius: "50%", background: "#fff", transform: `translateX(${on ? 20 : 0}px)`, transition: "transform .2s" }} />
      </span>
    </button>
  );
}
