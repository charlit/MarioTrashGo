#!/usr/bin/env bash
# Vérifie que la version en ligne de TrashGO World est bien la dernière poussée sur GitHub.
# Usage : bash .claude/skills/livrer/verifier.sh [URL]
# Compare l'empreinte SHA-256 de la page en ligne avec public/index.html du commit origin/main,
# puis contrôle l'en-tête de cache et le classement. Aucune modification, lecture seule.

set -u
URL="${1:-https://games-carlitos.tail736807.ts.net/mariotrashgo/}"
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
ko=0

git -C "$REPO" fetch -q origin main 2>/dev/null
ref="origin/main"
git -C "$REPO" rev-parse -q --verify "$ref" >/dev/null || ref="HEAD"
commit="$(git -C "$REPO" log -1 --format='%h %s' "$ref")"
git -C "$REPO" show "$ref:public/index.html" > "$TMP/attendu.html"

code="$(curl -s -m 15 -D "$TMP/entetes.txt" -o "$TMP/en_ligne.html" -w '%{http_code}' "$URL")"
echo "Page      : $URL"
echo "Attendu   : $commit"
if [ "$code" != "200" ]; then
  echo "KO  page en ligne : code HTTP $code (502 = conteneur arrêté, lancer docker run)"
  exit 1
fi
echo "OK  page en ligne : HTTP 200"

h_att="$(sha256sum "$TMP/attendu.html" | cut -c1-16)"
h_lig="$(sha256sum "$TMP/en_ligne.html" | cut -c1-16)"
if [ "$h_att" = "$h_lig" ]; then
  echo "OK  version : identique au dernier commit ($(wc -c < "$TMP/en_ligne.html") octets)"
else
  echo "KO  version : DIFFÉRENTE (en ligne $(wc -c < "$TMP/en_ligne.html") octets, attendu $(wc -c < "$TMP/attendu.html"))"
  # retrouver quel commit est en ligne, si c'est un ancien
  for c in $(git -C "$REPO" log --format=%h -40 "$ref"); do
    if [ "$(git -C "$REPO" show "$c:public/index.html" 2>/dev/null | sha256sum | cut -c1-16)" = "$h_lig" ]; then
      echo "    → la version en ligne correspond à : $(git -C "$REPO" log -1 --format='%h %s (%cr)' "$c")"
      break
    fi
  done
  ko=1
fi

if grep -qi '^cache-control:.*no-cache' "$TMP/entetes.txt"; then
  echo "OK  cache : Cache-Control no-cache"
else
  echo "KO  cache : pas de Cache-Control no-cache (ancien server.js ?)"
  ko=1
fi

api="$(curl -s -m 10 -o "$TMP/scores.json" -w '%{http_code}' "${URL%/}/api/scores")"
if [ "$api" = "200" ] && head -c 1 "$TMP/scores.json" | grep -q '\['; then
  echo "OK  classement : api/scores répond ($(grep -o '"name"' "$TMP/scores.json" | wc -l | tr -d ' ') score(s))"
else
  echo "KO  classement : api/scores → HTTP $api"
  ko=1
fi

[ "$ko" = 0 ] && echo "=> Tout est en ligne et à jour." || echo "=> Quelque chose ne va pas (voir KO ci-dessus)."
exit "$ko"
