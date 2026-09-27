---
name: livrer
description: Livre une modification de TrashGO World de bout en bout — lance la QA (skill qa-jeu), commite en français, pousse sur GitHub (charlit/MarioTrashGo), donne les deux commandes de déploiement du Mac mini, puis vérifie depuis ici que la page en ligne (/mariotrashgo/) est bien la nouvelle version. Utiliser quand on demande « livre », « livrer », « mets en ligne », « déploie », « commit et push et déploie », ou pour vérifier ce qui tourne en production (« c'est à jour en ligne ? », « ça marche pas sur mon téléphone »).
---

# Livrer TrashGO World

Le rituel habituel est : QA, commit, push, déploiement sur le Mac mini, puis vérification en ligne.
Ce skill l'enchaîne **dans cet ordre**, et s'arrête dès qu'une étape échoue.

- Repo : `C:\Users\lesma\Github\TrashGoMario`, branche `main`, remote `https://github.com/charlit/MarioTrashGo`.
- Production : `https://games-carlitos.tail736807.ts.net/mariotrashgo/`, servie par la page « Mes jeux »
  (conteneur `hub`), qui renvoie vers le conteneur `trashgo-world` (port 8081 du Mac mini).
- Invoquer ce skill, c'est une demande explicite de commit et de push. Ne pousse **rien d'autre** que les
  modifications de ce repo, et ne force jamais un push.

## 1. Vérifier ce qu'il y a à livrer

```bash
cd /c/Users/lesma/Github/TrashGoMario && git status --short && git log --oneline origin/main..HEAD
```

- Si rien n'est modifié et qu'aucun commit n'est en attente : passe directement à l'étape 5 (vérification en ligne).
- Si des fichiers non voulus apparaissent (`public/__qa_checks_tmp.js`, `data/`, `package-lock.json`, `node_modules/`),
  supprime-les ou ignore-les. Ils ne doivent jamais être commités.

## 2. QA obligatoire

Suis le skill **`qa-jeu`** : suite automatique, en rechargeant la page avec un `?debug&v=<valeur unique>`
pour éviter le cache. Si `public/index.html` a changé, fais aussi les contrôles visuels liés à la modification.

- **Tous les tests doivent passer.** En cas d'échec, **ne commite pas**. Corrige (jeu ou test), relance la QA,
  puis présente le correctif à l'utilisateur.
- Supprime `public/__qa_checks_tmp.js` à la fin.

## 3. Commit et push

Rédige un message **en français** : un titre court (ce qui change pour le joueur), puis quelques lignes
(pourquoi, et ce que la QA vérifie). Termine par les lignes d'attribution demandées dans la conversation
(par exemple `Co-Authored-By: …`).

```bash
cd /c/Users/lesma/Github/TrashGoMario && git add -A && git status --short
```

Relis la liste, puis commite avec un heredoc et pousse :

```bash
git push -q && git log --oneline -1 && git status -sb | head -1
```

La dernière ligne doit être `## main...origin/main`, sans « ahead ». Sinon, le push a échoué : dis-le et arrête-toi.

## 4. Déploiement sur le Mac mini (c'est l'utilisateur qui le lance)

Tu n'as **pas accès** au Mac mini. Donne ces deux commandes, **chacune dans son propre bloc** :

```bash
cd ~/MarioTrashGo && git pull && docker build -t trashgo-world . && docker rm -f trashgo-world
```

```bash
docker run -d --name trashgo-world --restart unless-stopped -p 8081:8080 -v "$HOME/MarioTrashGo/data:/app/data" -e PORT=8080 -e VISITS_KEY=ton_mot_de_passe trashgo-world
```

Rappelle-lui que :
- la 1re commande **supprime** le conteneur, et que le jeu est hors ligne (erreur 502) jusqu'à la 2e ;
- `docker compose` n'est **pas** installé sur le Mac mini : il ne faut pas l'utiliser ;
- `VISITS_KEY` doit être son vrai mot de passe, jamais la valeur d'exemple.

Demande-lui de te prévenir quand c'est fait.

## 5. Vérifier la production (depuis ici)

Lance le script de vérification :

```bash
bash /c/Users/lesma/Github/TrashGoMario/.claude/skills/livrer/verifier.sh
```

Il compare la page en ligne avec `public/index.html` du dernier commit poussé (empreinte SHA-256), et contrôle
l'en-tête `Cache-Control: no-cache` et la réponse du classement (`api/scores`). Il affiche `OK` ou `KO` pour chaque point.

| Symptôme | Cause probable | Que faire |
|---|---|---|
| Code HTTP **502** | conteneur arrêté, souvent après `docker rm -f` sans `docker run` | relancer la commande `docker run` |
| Page **différente** du dernier commit | `git pull` pas fait, `docker build` pas relancé, ou lancé dans un autre dossier | refaire les 2 commandes dans `~/MarioTrashGo` |
| `Cache-Control` absent | ancienne version de `server.js` en ligne | redéployer |
| `api/scores` en **404** | appel d'API absolu, qui part à la racine | vérifier `SCORES_API = 'api/scores'` (adresse relative) |
| Tout est OK mais le téléphone montre l'ancienne version | copie gardée par Safari avant la correction du cache | ouvrir `…/mariotrashgo/?v=<n'importe quoi>`, ou réinstaller l'icône de l'écran d'accueil |
| Nom de domaine introuvable | ancienne adresse `mac-mini-de-jussan…` | la bonne machine est **games-carlitos** |

## 6. Rapport

Termine par un résumé court en français :
- le résultat de la QA (X/X) ;
- le commit poussé (hash, titre, lien vers le repo) ;
- les deux commandes de déploiement, si elles n'ont pas encore été lancées ;
- le résultat de la vérification en ligne, ou « en attente du déploiement ».
