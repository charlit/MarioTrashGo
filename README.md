# TrashGO World — TrashGO en mode Mario

Même direction artistique que TrashGO (néon rose / aqua / jaune, Courier New,
même skateur, pièces éclair, rails de grind, silhouettes de Biarritz, Anglet
et Bayonne, lauburu, bandeau SAPAR) mais en jeu de plateforme à défilement
horizontal façon Super Mario.

## Le jeu

- **3 niveaux** : 1-1 Biarritz, 1-2 Anglet (skatepark de plage), 1-3 Bayonne (de nuit).
  Ensuite ça reboucle en 2-1, 2-2… avec des ennemis plus rapides.
- **Contrôles clavier** : ← → (ou Q/D) pour rouler, Espace / ↑ / Z pour sauter
  (maintenir = saut plus haut), X ou ↓ pour une figure en l'air.
- **Mobile** : manette tactile sous l'écran (◀ ▶ FIGURE SAUT).
- Cônes qui marchent = Goomba, mouettes = ennemis volants : on leur saute dessus.
- Blocs `?` = pièces, briques cassables quand on est grand.
- **Gâteau basque** = champignon (on grandit), **piment d'Espelette** = étoile (invincible).
- Les tuyaux sont des **poubelles** vertes, l'arrivée est un **fronton** basque.
- Rails : grind automatique à l'atterrissage, figures en l'air = points × combo
  (attention, atterrir en pleine figure = BAIL, combo perdu).
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
