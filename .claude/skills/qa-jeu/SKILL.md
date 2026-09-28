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
- Ouvre `http://localhost:8198/?debug&v=<valeur unique>`, par exemple un horodatage, puis vérifie avec
  `read_console_messages` qu'il n'y a aucune erreur.
  **Change la valeur de `v` à chaque rechargement après une modification.** Le serveur Python n'envoie aucun en-tête
  de cache, donc le navigateur peut garder l'ancienne page. Pour vérifier la version chargée, cherche dans
  `document.documentElement.outerHTML` un commentaire que tu viens d'ajouter.
- **Si le panneau du navigateur est masqué**, la page fait 0 × 0 pixel, et les tests qui visent un point de l'écran
  (« soleil secret », « croix glissante ») échouent. Fais `resize_window` en preset `mobile` avant de lancer la suite.

## 2. API de debug (`window.__tg`, seulement avec `?debug`)

| Appel | Effet |
|---|---|
| `start(i)` | Nouvelle partie au niveau `i` (0 = Biarritz, 1 = Anglet, 2 = Bayonne, … le boss Tartalo à la Rhune est toujours le DERNIER niveau), intro sautée |
| `run(n)` | Avance de `n` images (60 par seconde de jeu) |
| `press(k)` / `release(k)` | Touches `left`, `right`, `jump` (les figures sont automatiques) |
| `warp(col)` | Téléporte le joueur à la colonne `col`, sans changer sa hauteur |
| `place(x, y, vy)` | Place le joueur au pixel près, avec une vitesse verticale |
| `info()` | `{ state, levelIndex, score, coinCount, lives, timeLeft, big, x, y, onGround, grinding, camX, enemies }` |
| `player()` / `enemies()` / `coins()` / `flames()` / `boss()` / `bossRocks()` / `shockwaves()` | Objets du jeu, modifiables directement (ex. `e.active = true`) |
| `grid()` | Niveau en texte, une chaîne par rangée (légende des tuiles dans le code : `# B ? M E X S = R T t p q`) |
| `def()` / `consts` | Infos du niveau (`cols`, `flag`, `checkpoint`) et constantes (`T`, `GROUND_ROW`, `GROUND_Y`…) |
| `setPaused(b)` / `isPaused()` / `setCoins(n)` | Pause, et nombre de pièces (pour tester le 1UP) |
| `beginBasket()` / `basket()` / `shoot(dx, dy)` / `basketConsts` | Mini-jeu du panier : le lancer, lire son état (`phase`, `shot`, `made`, `results`, `ball`), tirer avec un geste en pixels du canvas (`dy` vers le haut ; 225 = tir idéal). `hx`/`hy`/`move`/`moveT` : position et mouvement du cercle |
| `toTitle()` | Revient à l'écran d'accueil (pour tester le passage secret du soleil) |
| `render()` | Redessine une image. Obligatoire avant chaque capture d'écran quand le panneau est masqué |

## 3. Suite de tests automatisés

La suite est dans `checks.js`, à côté de ce fichier. Elle contient 27 tests qui repartent chacun
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
- Drapeau → bonus de temps → niveau suivant, pour **chaque** niveau (sauf l'arène du boss, sans drapeau).
- Boss Tartalo (4e niveau) : blesse au contact, lance des rochers, onde de choc à l'atterrissage, vulnérable seulement
  quand il est sonné (étoiles), K.O. en 3 coups sur la tête. Sa mort TERMINE LE JEU : écran de victoire « ZORIONAK ! »,
  bonus de 1000 par vie restante, feu d'artifice, enregistrement du score, appui ailleurs = nouvelle partie.
  Il doit rester BATTABLE sans triche : un robot qui esquive et saute sur la tête quand il est sonné doit gagner
  (test « boss battable »). Il ne doit jamais coincer le joueur, ni être protégé par une plateforme au-dessus de lui.
- Mini-jeu du panier après Biarritz : 5 ballons, 3 paniers pour le bonus ; sinon -500 pts par panier manquant
  (sans perdre de vie), et on passe à Anglet dans les deux cas. Après le 1er panier le cercle bouge de gauche à droite,
  après le 2e de haut en bas ; il doit rester marquable en lançant au bon moment. La manette est masquée pendant l'épreuve, le glissé au doigt lance le ballon,
  un geste trop court rate. Le test « drapeau » attend l'état `basket` après Biarritz.
- Lunettes roses : elles tournent au milieu de l'accueil ; au START elles volent jusqu'au visage du joueur
  (éclair + « SAPAR ! »), puis il les porte en jeu. `glassesFx()` / `startFromTitle()` dans l'API de debug.
- Passage secret : sur l'écran d'accueil, toucher le soleil lance directement le boss (ailleurs : partie normale).
- Écrans de fin (victoire, game over) : les appuis sont ignorés pendant 1 seconde, pour ne pas perdre son score
  en tapant encore sur SAUT.
- Sauter sur place en boucle ne rapporte presque rien, et le combo reste plafonné à x8.
  (Bug historique : les figures automatiques faisaient monter le combo sans limite.)
- Les pièces au-dessus d'un rail se ramassent en glissant, sans sauter (posées à hauteur du rail + 1).
- Flammes au sol : au sol, jamais sous un rail/une planche ni sur un point de réapparition ; sans danger au repos, blessent allumées, piment = immunité.
  Chacune a une piste d'élan (4 tuiles de sol dégagé avant, 3 après) et se franchit en sautant pendant qu'elle brûle :
  jamais juste après la réception d'un trou, sous des briques basses, ni coincée entre deux obstacles.

## 4. Contrôles visuels (pas couverts par la suite)

Pour obtenir des captures nettes même quand le panneau est masqué : `start`, `run`, `render()`, puis `computer screenshot`.
Pour agrandir le personnage, copie des zones du canvas dans un canvas temporaire affiché en `position:fixed`, puis supprime-le.
Vérifie :
- **Course** : les jambes alternent quand on tient `right` (capture 8 images espacées de 3 frames). À l'arrêt, les jambes sont droites.
- **Flammes** : grille sur le trottoir ; flamme en pixel art (rouge-orangé, cœur blanc, langues qui vacillent) qui grandit par étapes : étincelle puis petite flamme en alerte (avec braises et lueur), boule de feu puis grande flamme de 54 px une fois allumée. Aucun trait au-dessus.
- **Pièces** : disque doré, anneau jaune vif, gros éclair clair ; elles tournent sur elles-mêmes (tranche visible de profil,
  éclair à l'envers sur l'autre face). Dessinées en rayon 10, mais ramassées en rayon 8 (sinon on attrape sans sauter
  les pièces placées 2 cases au-dessus du sol).
- **Planche de skate** visible SEULEMENT pendant un grind : à plat sur les deux trucks (50-50) ou inclinée nez sur la barre
  et arrière levé (nosegrind), avec le nom de la figure. Jamais au sol, en l'air ni au crash.
- **Figures** (automatiques à chaque saut, à tour de rôle) : SALTO (rotation), GRAND ÉCART (jambes écartées), VRILLE (le personnage s'affine puis revient). Il n'y a plus de touche FIGURE.
- **Décors** : Biarritz DE JOUR (ciel bleu, nuages, mer turquoise et surfeurs, Hôtel du Palais, phare blanc, tentes rayées, Rocher de la Vierge et passerelle, crampottes, promenade blanche, palmiers, hortensias), la Rhune (montagne, fronton, moutons), Anglet (dunes, planches de surf), Bayonne (nuit, étoiles, lauburu).
  Vérifie aussi les tonneaux de cidrerie (cerclages, robinet, goutte de cidre), les blocs `?` jaunes, le drapeau au lauburu et le fronton « ONGI ETORRI ».
- **Mobile** : `resize_window` en preset `mobile`, puis recharge la page. La manette doit s'afficher sous le canvas,
  sans défilement horizontal. Envoie des `PointerEvent` (`pointerType: 'touch'`, `clientX`) sur `#dpad` :
  un `pointerdown` à droite doit activer `keys.right`, puis un `pointermove` vers la gauche **sans pointerup**
  doit passer à `keys.left`. Vérifie aussi que ⏸ fige le jeu et le chrono (`__tg.isPaused()`).
  - **Paysage** : une taille personnalisée n'émule pas le tactile. Recopie les règles `@media (orientation: landscape)`
    dans un `<style>` temporaire, avec `#pad { display: contents !important }`, à 812×375. Tu dois voir la croix à gauche,
    le jeu au centre, SAUT à droite (touches redessinées : chevrons SVG, gros bouton SAUT), et le texte du haut sur une seule ligne.
  - Remets ensuite le preset `desktop`.
- **HUD** : le score, les pièces ⚡, le monde, le chrono ⏱ (rouge sous 100) et les vies ♥ se mettent à jour.

## 5. Ce qui n'est pas testable en local

- Le **son** : Web Audio, sans sortie observable ici. Signale-le comme non vérifié.
- Le **classement** et les **visites** (`/api/scores`, `/api/visits`) : le serveur Python ne sert que les fichiers.
  Pour les tester, installe les dépendances avec `npm install` puis lance `node server.js` (port 8080),
  ou le docker-compose (port 8081).

## 6. Rapport

Termine par un résumé en français, dans cet ordre :
- le résultat de la suite (X/27, avec le détail des échecs) ;
- les contrôles visuels faits, avec une capture si quelque chose a changé ;
- les bugs corrigés, avec `fichier:ligne` ;
- ce qui n'a pas pu être vérifié.

Ne commite pas sans que l'utilisateur le demande.
