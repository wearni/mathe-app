#!/usr/bin/env bash
# ============================================================
#  Mathe App - Version hochzählen und veröffentlichen
#
#  Aufruf:   ./bump.sh "Was geändert wurde"
#
#  Zählt die Versionsnummer in sw.js um eins hoch, committet alles
#  und pusht zu GitHub. Dadurch holt sich die installierte PWA die
#  neue Fassung beim nächsten Öffnen automatisch.
# ============================================================
set -e
cd "$(dirname "$0")"

cur=$(grep -oE "const VERSION = '[0-9]+\.[0-9]+\.[0-9]+'" sw.js | grep -oE "[0-9]+\.[0-9]+\.[0-9]+")
if [ -z "$cur" ]; then
  echo "Konnte die Version in sw.js nicht finden." >&2
  exit 1
fi

IFS='.' read -r major minor patch <<< "$cur"
new="$major.$minor.$((patch + 1))"

sed -i.bak "s/const VERSION = '$cur'/const VERSION = '$new'/" sw.js && rm -f sw.js.bak

git add -A
git commit -m "${1:-Update} (v$new)"
git push

echo "Version $cur -> $new veröffentlicht."
echo "Die App aktualisiert sich beim nächsten Öffnen von selbst."
