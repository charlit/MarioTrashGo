---
name: nouveau-niveau
description: Ajoute un niveau à TrashGO World à partir d'une ville ou d'une ambiance du Pays basque (Saint-Jean-de-Luz, Hendaye, Espelette…) — plan du niveau avec l'éditeur du jeu (sol, trous, blocs, tonneaux, rails, pièces, ennemis, flammes), thème et décor en couches dans la direction artistique, musique, puis QA. Respecte les règles de jouabilité apprises (tonneaux ≤ 4 tuiles, flammes avec piste d'élan, pièces à hauteur du rail, boss toujours en dernier). Utiliser quand on demande « ajoute un niveau », « nouveau niveau », « un niveau à <ville> », « une nouvelle ville ».
---

# Ajouter un niveau à TrashGO World

Tout se passe dans `public/index.html`. Un niveau, ce sont **quatre éléments à garder alignés** :

| Élément | Où | Rôle |
|---|---|---|
| Définition | tableau `LEVELS` | plan du niveau (`cols`, `checkpoint`, `flag`, `build(L)`) |
| Thème | tableau `themes` | ciel, soleil, couleur d'accent, sol, nom affiché |
| Décor | fonction `buildXxx()` + `CITY_BUILDERS` | couches de parallaxe (loin, milieu, près) |
| Musique | tableau `SONGS` (dans `Audio2`) | thème chiptune du niveau |

## Règle n° 1 : l'ordre compte

`themes`, `SONGS` et `LEVELS` sont associés **par position**. Le niveau n° i utilise `themes[i]` et `SONGS[i]`.
- **Le boss (La Rhune) reste TOUJOURS le dernier niveau** : sa mort termine le jeu. Insère donc le nouveau niveau
  **juste avant** lui.
- Insère le thème **et** la musique **à la même position** dans leurs tableaux. Sinon, tout se décale :
  le boss aurait la musique du niveau précédent et le décor d'une autre ville.
- Le numéro affiché (« WORLD 1-4 ») se calcule tout seul, et le boss devient « 1-5 ».

## 1. Imaginer le niveau

Pars de la ville demandée, et trouve 3 à 5 éléments **reconnaissables** qui iront dans le décor.
Par exemple, pour Saint-Jean-de-Luz : l'église Saint-Jean-Baptiste, la Maison de l'Infante, le port et ses thoniers,
la plage et ses cabines, la rue Gambetta. Garde une idée de gameplay dominante, par exemple beaucoup de rails,
des planches au-dessus de l'eau, ou un passage de nuit. Les niveaux existants (Biarritz, Anglet, Bayonne) servent de modèles.

## 2. Le plan : l'éditeur `L`

La hauteur `h` se compte en tuiles au-dessus du sol (1 tuile = 30 px). Les colonnes vont de 0 à `cols - 1`.

| Appel | Effet |
|---|---|
| `L.ground(a, b)` | sol des colonnes `a` à `b - 1` (les trous sont les colonnes sans sol) |
| `L.row(x, h, 'B?M=')` | tuiles posées à partir de la colonne `x` : `B` brique, `?` bloc pièce, `M` gâteau basque, `E` piment caché dans une brique, `S` pierre, `=` planche traversable par dessous, espace = rien |
| `L.pipe(x, h)` | tonneau de cidrerie, 2 colonnes de large, `h` tuiles de haut |
| `L.stairs(x, n, 'up'/'down')` | escalier de `n` marches en pierre |
| `L.col(x, n)` | colonne de pierre de `n` tuiles |
| `L.rail(x, h, len)` | rail de glisse |
| `L.coins(x, h, n)` | `n` pièces alignées |
| `L.enemy(x, 'cone')` / `L.enemy(x, 'gull', h)` | cône qui marche / mouette qui vole à hauteur `h` |
| `L.flame(x, phase)` | bouche d'égout à flammes, avec `phase` (0-199) pour décaler son cycle |

Modèle à copier (dans `LEVELS`, **juste avant** le bloc du boss) :

```js
{ // 1-4 SAINT-JEAN-DE-LUZ : le port et la Grande Plage
  cols: 180, checkpoint: 90, flag: 166,
  build(L) {
    L.ground(0, 60); L.ground(63, 120); L.ground(124, 180);   // trous de 3 et 4 tuiles
    L.row(12, 4, '?B?M?');
    L.pipe(30, 3); L.enemy(35, 'cone');
    L.rail(45, 1, 8); L.coins(46, 2, 6);                       // pièces à h + 1 au-dessus du rail
    // …
    L.stairs(150, 6, 'up'); L.col(156, 6);
    L.row(166, 1, 'S');                                        // socle du drapeau (obligatoire)
    L.flame(80, 0); L.flame(135, 100);
  }
},
```

## 3. Règles de jouabilité (la QA les vérifie)

- **Départ :** sol sous la colonne 2 et au moins 5 colonnes calmes, sans ennemi ni flamme.
- **Checkpoint :** vers le milieu, sur du sol, sans flamme à ±1 colonne.
- **Arrivée :** `L.row(flag, 1, 'S')` pose le socle du drapeau. Il faut `cols ≥ flag + 10`, sinon le fronton est coupé.
  Garde du sol de `flag - 4` jusqu'à la fin.
- **Tonneaux et marches : 4 tuiles au plus.** Un saut monte à 117 px sur place et 144 px avec élan ;
  un tonneau de 4 tuiles (120 px) demande donc de l'élan. Une marche d'escalier ne monte jamais de plus de 4 tuiles d'un coup.
- **Trous : 4 tuiles au plus** sans aide. Un saut couvre environ 101 px (3,4 tuiles) avec un élan moyen, et 166 px (5,5 tuiles)
  à pleine vitesse. Un trou de 5 tuiles doit avoir une planche (`=`) ou un rail au-dessus.
- **Pièces au-dessus d'un rail** de hauteur `h` : `L.coins(x, h + 1, n)`. À `h + 2`, le personnage les rate en glissant.
- **Flammes :**
  - sur du sol, avec **4 colonnes de sol dégagé avant et 3 après** (aucun bloc, tonneau ni escalier à hauteur 1-2) ;
  - jamais juste après la réception d'un trou, sous des briques basses (le saut serait coupé), ni sous un rail ou une planche ;
  - décale les `phase` pour qu'elles ne brûlent pas en même temps. Compte 2 à 4 flammes par niveau.
- **Ennemis :** ne les empile pas sur un passage obligé étroit. Une mouette vole entre `h` et `h ± 0,7`.
- **Longueur :** 170 à 190 colonnes, soit un niveau terminable en bien moins que les 120 s du chrono.

## 4. Le thème (tableau `themes`, même position que le niveau)

```js
{ key: 'stjean', name: 'SAINT-JEAN-DE-LUZ', sky: ['#…', '#…'], silhouette: '#…', sun: '#…', accent: '#7fffd4', draw: null,
  day: true,                                                              // seulement pour un niveau de jour
  ground: { top: '#…', joint: '#…', body: '#…', under: '#…' } },          // optionnel : sol clair, herbe…
```

- **Direction artistique :** néon rose `#ff2fa0`, aqua `#7fffd4`, jaune `#ffd400`, violet `#b400ff`. L'accent colore le liseré du sol,
  le marquage de la manette et les briques. Par défaut, le jeu est **de nuit ou au crépuscule** ; seul Biarritz est de jour.
  Si tu fais un niveau de jour, mets `day: true` : ça ajoute la bande sombre derrière le score.
- **Codes basques** à placer dans le décor : lauburu, rouge `#c8102e` et vert `#2f8f4e`, maisons blanches à colombages
  et volets rouges ou verts, fronton, txapela, hortensias, et quelques mots en basque (`ONGI ETORRI`, `SAGARDOA`, `ZORIONAK`).

## 5. Le décor en couches (`buildXxx`)

Copie la structure de `buildAnglet()` ou `buildBiarritz()`, et enregistre la fonction dans `CITY_BUILDERS` sous la **même clé** que le thème.

```js
function buildStjean() {
  const far  = makeLayer(0.12, 51, (g, rnd, wrap) => { /* lointain : relief, silhouettes, monuments */ });
  const mid  = makeLayer(0.32, 52, (g, rnd, wrap) => { /* façades, port, plage, enseignes néon */ });
  const near = makeLayer(0.75, 53, (g, rnd, wrap) => { /* mobilier : lampadaires, balustrade, végétation */ });
  return { far, mid, near };                                  // + clouds (0.05) pour un ciel de jour
}
```

- **Aides disponibles :** `building()` (façades avec fenêtres, volets, colombages), `neonSign()`, `lampPost()`, `palmTreeDay()`,
  `umbrellaPine()`, `hydrangea()`, `glow()`, `drawLauburu()`.
- **Raccords de couches :** chaque couche fait `LAYER_W` px et se répète en boucle. Dans une rangée de façades collées,
  la dernière façade doit s'arrêter pile au bord (`if (x + w > LAYER_W) { w = LAYER_W - x; if (w < 16) break; }`).
  Sinon, elle chevauche la première au raccord. Utilise `wrap(x, w, fn)` pour les éléments isolés qui débordent.
- **Horizon :** les bâtiments du lointain reposent sur `GROUND_Y` (ou sur `GROUND_Y - 84` s'il y a de la mer devant, comme à Biarritz).

## 6. La musique (tableau `SONGS`, même position que le niveau)

```js
{ // Saint-Jean-de-Luz
  melody: [/* fréquences en Hz, null = silence */],
  bass:   [/* même longueur que melody */],
  bpm: 136
},
```

Garde des mélodies de 8 ou 16 notes, dans l'esprit chiptune des autres (bpm entre 120 et 150).

## 7. Vérifier

1. Vérifie la syntaxe :
   `node -e "const s=require('fs').readFileSync('public/index.html','utf8');new Function(s.match(/<script>([\s\S]*)<\/script>/)[1]);console.log('ok')"`
2. Lance le skill **`qa-jeu`**. Les tests « niveaux », « drapeau », « flammes franchissables », « pièces sur rails » et
   « boss » parcourent **tous** les niveaux, nouveau compris, et vérifient automatiquement les règles de la section 3.
   Corrige chaque échec, que la cause soit dans le plan du niveau ou dans le test.
3. **Contrôle visuel :** fais des captures du nouveau niveau à 3 endroits (début, milieu, fin), sur ordinateur et en mode téléphone.
   Vérifie les raccords du décor (couche du milieu) et la lisibilité du score et des ennemis sur le ciel.
4. Joue-le de bout en bout avec le mode debug : `start(i)`, `press('right')`, sauts aux obstacles. Il doit être
   terminable avec 3 vies. Si un passage fait mourir à coup sûr, simplifie-le.
5. Mets à jour le **README** (liste des niveaux), puis propose de **livrer** (skill `livrer`).

## Rapport

Termine par un résumé en français :
- l'idée du niveau et les éléments de la ville qu'on reconnaît dans le décor ;
- sa position (le boss passe en 1-N) ;
- le résultat de la QA ;
- les captures ;
- ce qui n'a pas pu être vérifié (le son de la nouvelle musique).
