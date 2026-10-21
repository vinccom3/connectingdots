# Connecting Dots

Website von Minoas Cirillo, connectingdots.world. Vite-Projekt, Vercel baut automatisch.

- `index.html`, `src/main.js`, `src/style.css` – v2: Wortmarke aus Punkten, Auflösung ins 3D-Universum, Fokus, Panel, Index
- `public/data/nodes.json` – alle Punkte (Artists, Labels, Releases). Neue Verbindung = neuer Eintrag hier
- `public/data/edges.json` – Verbindungen mit Beziehungstyp (`released`, `owns`, `manages`, …) und die Verben in `relations`
- `public/assets/` – Favicon
- `legacy/v1.html` – Prototyp v1

Lokal: `npm install`, dann `npm run dev`. Build: `npm run build` → `dist/`.

Die JSON-Dateien werden zur Laufzeit geladen und lassen sich ohne Build-Kenntnis ändern. Jeder Knoten und jede Kante ist belegt (Discogs, Beatport, Deezer, Labelseiten). Quellen stehen im Knoten unter `links`.
