---
name: qa-jeu
description: QA de TrashGO World (le jeu de plateforme de ce repo) — lance la suite de tests automatisés des mécaniques (saut, poubelles, blocs, ennemis, gâteau, rails, trous, drapeau, figures, chrono) via le mode ?debug, vérifie le rendu desktop et mobile, puis corrige et re-teste. Utiliser quand on demande « qa », « teste le jeu », « vérifie que ça marche », ou après toute modification de public/index.html (physique, niveaux, dessin, contrôles).
---

# QA TrashGO World

Le jeu tient dans un seul fichier, `public/index.html` (canvas 390×620, tuiles de 30 px).
Cette QA le teste **image par image** grâce au mode `?debug`. Le panneau navigateur
est souvent masqué, et `requestAnimationFrame` y est alors en pause : un écran figé
n'est donc pas forcément un bug. On pilote le jeu avec `window.__tg` au lieu d'attendre la boucle.

## 1. Lancer le jeu

- Démarre la preview avec `preview_start` `{ name: "trashgo-world" }`. La config est dans
  `C:\Users\lesma\Github\.claude\launch.json` et sert `TrashGoMario/public` sur le port 8198.
  Hors de cette machine, lance `python -m http.server 8198 --directory public`.
- Ouvre `http://localhost:8198/?debug`, puis vérifie avec `read_console_messages` qu'il n'y a aucune erreur.

## 2. API de debug (`window.__tg`, seulement avec `?debug`)

| Appel | Effet |
|---|---|
| `start(i)` | Nouvelle partie au niveau `i` (0 = Biarritz, 1 = Anglet, 2 = Bayonne, 3+ = monde 2…), intro sautée |
| `run(n)` | Avance de `n` images (60 par seconde de jeu) |
| `press(k)` / `release(k)` | Touches `left`, `right`, `jump`, `trick` |
| `warp(col)` | Téléporte le joueur à la colonne `col`, sans changer sa hauteur |
| `place(x, y, vy)` | Place le joueur au pixel près, avec une vitesse verticale |
| `info()` | `{ state, levelIndex, score, coinCount, lives, timeLeft, big, x, y, onGround, grinding, camX, enemies }` |
| `player()` / `enemies()` | Objets du jeu, modifiables directement (ex. `e.active = true`) |
| `grid()` | Niveau en texte, une chaîne par rangée (légende des tuiles dans le code : `# B ? M E X S = R T t p q`) |
| `def()` / `consts` | Infos du niveau (`cols`, `flag`, `checkpoint`) et constantes (`T`, `GROUND_ROW`, `GROUND_Y`…) |
| `render()` | Redessine une image. Obligatoire avant chaque capture d'écran quand le panneau est masqué |

## 3. Suite de tests automatisés

La suite est dans `checks.js`, à côté de ce fichier. Elle contient 12 tests qui repartent chacun
d'une partie neuve. Pour l'exécuter :

1. Copie le script dans le dossier servi : `cp .claude/skills/qa-jeu/checks.js public/__qa_checks_tmp.js`.
   Ce fichier est dans le `.gitignore`.
2. Exécute-le dans la page avec `javascript_tool` :
   ```js
   const src = await fetch('/__qa_checks_tmp.js', { cache: 'no-store' }).then((r) => r.text());
   const r = (0, eval)(src);
   ({ total: r.total, echecs: r.echecs, fails: r.results.filter((x) => !x.ok) })
   ```
3. Supprime `public/__qa_checks_tmp.js` à la fin.

Tous les tests doivent passer. Pour un échec, commence par savoir si c'est **le jeu** ou **le test** qui est en cause.
Exemple déjà vu : un cône qui tue le joueur pendant qu'il suit le gâteau, alors que le test ne vise que le bonus.
Corrige le bon côté, et ajoute un test à `checks.js` pour chaque nouveau bug trouvé.

Règles de jeu que la suite protège :
- Le saut monte à au moins 100 px sur place et au moins 126 px avec élan. Aucune poubelle ne dépasse **4 tuiles**,
  et aucune marche d'escalier ne dépasse 4 tuiles. (Bug historique : la 3e poubelle du 1-1 était infranchissable.)
- Chaque niveau a du sol au départ et au checkpoint, un socle `S` sous le drapeau, et un fronton entier avant la fin.
- Drapeau → bonus de temps → niveau suivant, pour **chaque** niveau.

## 4. Contrôles visuels (pas couverts par la suite)

Pour obtenir des captures nettes même quand le panneau est masqué : `start`, `run`, `render()`, puis `computer screenshot`.
Pour agrandir le personnage, copie des zones du canvas dans un canvas temporaire affiché en `position:fixed`, puis supprime-le.
Vérifie :
- **Course** : les jambes alternent quand on tient `right` (capture 8 images espacées de 3 frames). À l'arrêt, les jambes sont droites.
- **Pas de planche de skate** visible, ni au sol ni en l'air ni au crash.
- **Figures** : SALTO (rotation), GRAND ÉCART (jambes écartées), VRILLE (le personnage s'affine puis revient).
- **Décors** : Biarritz (vagues, rocher, phare), Anglet (dunes, planches de surf), Bayonne (nuit, étoiles, lauburu).
  Vérifie aussi les poubelles vertes, les blocs `?` jaunes, le drapeau au lauburu et le fronton « ONGI ETORRI ».
- **Mobile** : `resize_window` en preset `mobile`, puis recharge la page. La manette ◀ ▶ FIGURE SAUT doit s'afficher
  sous le canvas, sans défilement horizontal. Remets ensuite le preset `desktop`.
- **HUD** : le score, les pièces ⚡, le monde, le chrono ⏱ (rouge sous 100) et les vies ♥ se mettent à jour.

## 5. Ce qui n'est pas testable en local

- Le **son** : Web Audio, sans sortie observable ici. Signale-le comme non vérifié.
- Le **classement** et les **visites** (`/api/scores`, `/api/visits`) : le serveur Python ne sert que les fichiers.
  Pour les tester, installe les dépendances avec `npm install` puis lance `node server.js` (port 8080),
  ou le docker-compose (port 8081).

## 6. Rapport

Termine par un résumé en français, dans cet ordre :
- le résultat de la suite (X/12, avec le détail des échecs) ;
- les contrôles visuels faits, avec une capture si quelque chose a changé ;
- les bugs corrigés, avec `fichier:ligne` ;
- ce qui n'a pas pu être vérifié.

Ne commite pas sans que l'utilisateur le demande.
