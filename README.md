# TrashGO World — TrashGO en mode Mario

Même direction artistique que TrashGO (néon rose / aqua / jaune, Courier New,
même personnage (désormais à pied, il court), pièces éclair, rails, silhouettes de Biarritz, Anglet
et Bayonne, lauburu, bandeau SAPAR) mais en jeu de plateforme à défilement
horizontal façon Super Mario.

## Le jeu

- **3 niveaux** : 1-1 Biarritz, 1-2 Anglet (skatepark de plage), 1-3 Bayonne (de nuit).
  Ensuite ça reboucle en 2-1, 2-2… avec des ennemis plus rapides.
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
- Les tuyaux sont des **poubelles** vertes, l'arrivée est un **fronton** basque.
- Rails : glissade automatique à l'atterrissage. Chaque saut lance une figure
  (salto, grand écart, vrille à tour de rôle) : si elle se termine en l'air, points × combo.
- 3 vies, checkpoint à mi-niveau, 100 pièces = 1UP, chrono de 300.

## Lancer en local

Le jeu est un seul fichier : `public/index.html`. Pour le tester sans serveur Node :

```bash
python -m http.server 8198 --directory public
```

Ajoute `?debug` à l'URL pour exposer `window.__tg` (avancer image par image, téléporter le joueur).

## Auto-hébergement (Mac mini, comme TrashGO)

Même serveur que TrashGO (`server.js` : jeu + `/api/scores` + `/api/visits`),
avec son propre classement dans `data/`. Il tourne sur le **port 8081** pour
pouvoir cohabiter avec TrashGO (8080).

```bash
docker compose up -d --build
```

Pense à changer `VISITS_KEY` dans `docker-compose.yml` avant de publier.
