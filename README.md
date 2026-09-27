# TrashGO World — TrashGO en mode Mario

Même direction artistique que TrashGO (néon rose / aqua / jaune, Courier New,
même personnage (désormais à pied, il court), pièces éclair, rails, silhouettes de Biarritz, Anglet
et Bayonne, lauburu, bandeau SAPAR) mais en jeu de plateforme à défilement
horizontal façon Super Mario.

## Le jeu

- **Mini-jeu du panier** entre Biarritz et Anglet : un panier de basket accroché à un fronton,
  5 ballons, il faut en marquer 3 (sinon -500 points par panier manquant). Après le 1er panier
  le cercle bouge de gauche à droite, après le 2e de haut en bas. On lance en
  glissant le doigt (ou la souris) vers le haut : la longueur du geste règle la force, son inclinaison la direction.
- **3 niveaux + un boss** : 1-1 Biarritz (de jour : Grande Plage, Rocher de la Vierge,
  Hôtel du Palais, crampottes), 1-2 Anglet (skatepark de plage), 1-3 Bayonne (de nuit),
  puis 1-4 **La Rhune** : le boss **Tartalo**, cyclope géant de la mythologie basque
  (béret, gilet en peau de mouton, makila). Il lance des rochers qui roulent et fait une onde
  de choc en retombant ; quand il est **sonné** (étoiles), saute-lui sur la tête — 3 coups.
  Sa mort **termine le jeu** : « ZORIONAK ! », feu d'artifice, bonus de 1000 points par vie
  restante, et on enregistre son score au TOP 10.
- **Contrôles clavier** : ← → (ou Q/D) pour courir, Espace / ↑ / Z pour sauter
  (maintenir = saut plus haut). Les figures sont automatiques à chaque saut.
- **Mobile** : manette tactile sous l'écran — croix ◀ ▶ d'un seul bloc (on glisse le
  pouce d'un côté à l'autre) et SAUT ; ⏸ et 🔊 en haut à gauche. En paysage, les commandes passent de
  chaque côté du jeu. Bouton ⏸ (ou P / Échap), pause automatique quand on quitte
  l'appli, vibration quand on écrase un ennemi ou qu'on est touché (Android).
  Ajouté à l'écran d'accueil, le jeu s'ouvre en plein écran.
- Cônes qui marchent = Goomba, mouettes = ennemis volants : on leur saute dessus.
- Blocs `?` = pièces, briques cassables quand on est grand.
- **Gâteau basque** = champignon (on grandit), **piment d'Espelette** = étoile (invincible).
- Les tuyaux sont des **tonneaux de cidrerie** (« SAGARDOA »), l'arrivée est un **fronton** basque.
- Des **flammes** jaillissent par moments de bouches d'égout : attends qu'elles s'éteignent ou saute par-dessus.
- Rails : glissade automatique à l'atterrissage. Chaque saut lance une figure
  (salto, grand écart, vrille à tour de rôle) : si elle se termine en l'air, points × combo.
- 3 vies, checkpoint à mi-niveau, 100 pièces = 1UP, chrono de 300.

## Lancer en local

Le jeu est un seul fichier : `public/index.html`. Pour le tester sans serveur Node :

```bash
python -m http.server 8198 --directory public
```

Ajoute `?debug` à l'URL pour exposer `window.__tg` (avancer image par image, téléporter le joueur).

## Auto-hébergement (Mac mini)

Même serveur que TrashGO (`server.js` : jeu + `api/scores` + `api/visits`), avec son
propre classement dans `data/`. Le conteneur écoute sur le **port 8081** du Mac.

Sur le Mac mini, `docker compose` n'est pas installé (Colima fournit seulement `docker`) :
on passe donc par `docker build` / `docker run`.

**Première installation**

```bash
git clone https://github.com/charlit/MarioTrashGo.git ~/MarioTrashGo
```

```bash
cd ~/MarioTrashGo && docker build -t trashgo-world .
```

```bash
docker run -d --name trashgo-world --restart unless-stopped -p 8081:8080 -v "$HOME/MarioTrashGo/data:/app/data" -e PORT=8080 -e VISITS_KEY=TON_MOT_DE_PASSE trashgo-world
```

**Mise à jour** (après un push), puis relancer la commande `docker run` ci-dessus :

```bash
cd ~/MarioTrashGo && git pull && docker build -t trashgo-world . && docker rm -f trashgo-world
```

**Vérifier** que le conteneur sert la version attendue :

```bash
curl -s http://localhost:8081/ | grep -c COMBO_MAX
```

Les scores et les visites restent dans `~/MarioTrashGo/data` (hors du conteneur).
Le jeu est publié via la page « Mes jeux » (conteneur `hub`) sous
`https://games-carlitos.tail736807.ts.net/mariotrashgo/`. Les appels à l'API sont relatifs
à la page : le jeu marche aussi bien à la racine que sous ce sous-chemin.
`docker-compose.yml` reste disponible pour une machine où `docker compose` est installé.
