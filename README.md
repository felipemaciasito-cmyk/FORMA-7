# FORMA-7 · Rallume le datacenter

Application d'apprentissage ludique (PWA) pour suivre **« La roadmap 7 jours »** de Humains Augmentés.
Le datacenter FORMA-7 est éteint : chaque salle correspond à un jour de la formation. Pour la rallumer,
il faut comprendre ses machines (notions), réussir les vérifications (exercices) et résoudre l'incident.

> Application personnelle et indépendante, non affiliée à Humains Augmentés, Anthropic, OpenAI ou Google.

## Ce que contient l'appli

- **9 salles** (Hall d'initialisation, Jours 1 à 7, Bibliothèque bonus), 23 baies (étapes), 53 notions.
- **Zéro zone de flou** : chaque terme technique est cliquable et ouvre sa fiche (3 niveaux : simple,
  standard, expert ; analogie ; exemple ; prérequis). Le script `scripts/validate-content.mjs` bloque le
  build si une notion est utilisée avant d'être définie.
- **Exercices** : QCM, vrai/faux, texte à trous, remise en ordre, câblage, « avec tes mots » (Feynman).
- **Simulateurs** : prédiction du mot suivant, comparateur des 3 assistants, barrette de contexte,
  Prompt Lab, simulateur de Projet, anatomie d'un SKILL.md, baie de brassage des connecteurs, boucle d'agent.
- **Jeu** : énergie (kW), 8 niveaux d'accréditation, Uptime (jours consécutifs), 12 badges, incidents
  avec fusibles, maintenance par révision espacée (méthode Leitner, 5 boîtes).
- **Atelier de Skills** : forger de vrais fichiers SKILL.md, contrôle qualité, export (feuille de partage iOS).
- **Signaux du jour** : missions générées chaque matin à partir des mails de la formation (voir Pipeline).
- **Claude optionnel** : avec une clé API (stockée sur l'appareil), correction des réponses libres,
  réexplication d'une notion, test de prompts et de Skills.
- **Synchronisation iPhone ↔ iPad** : la progression est fusionnée entre appareils via `progress/progress.json`
  dans le dépôt privé (jeton « Contents : Read and write »). Fusion sans perte : compteurs par appareil,
  unions, « le plus récent gagne » pour ce qui se modifie, et une « époque » pour les réinitialisations.
- **Fiches** de révision exportables en Markdown, hors-ligne, installable sur l'écran d'accueil iOS.

## Développer

```bash
npm install
npm run dev        # serveur de développement
npm run validate   # validateur « zéro zone de flou »
npm run build      # validation + build de production (dist/)
```

Contenu : `src/content/glossary.json` (notions) et `src/content/rooms/*.json` (salles). Les termes
techniques s'écrivent `[[id]]` ou `[[id|texte affiché]]`.

Icônes : `node scripts/gen-icons.mjs` (nécessite Playwright et Chromium).

## Déploiement

Chaque push sur `main` lance `.github/workflows/deploy.yml` : validation, build, publication sur
GitHub Pages (Settings › Pages › Source : **GitHub Actions**). Adresse :
`https://<compte>.github.io/FORMA-7/`.

## Pipeline des mails

Les missions privées vivent dans le dépôt **privé** `FORMA-7-data`. Une tâche planifiée Claude
(connecteurs Gmail et Google Drive) suit `FORMA-7-data/PIPELINE.md` chaque matin : lecture du nouveau
mail, génération de la mission, validation (`node ../FORMA-7/scripts/validate-content.mjs --data .`),
push, puis fiche Google Docs. L'appli lit le dépôt privé avec un jeton GitHub limité à ce dépôt.

Exemple de mission fictive pour les tests : `pipeline/fixtures/`.
