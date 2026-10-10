# Connecting Dots

Website von Minoas Cirillo, connectingdots.world. Eine statische Seite ohne Build-Schritt.

- `index.html` – Seite, Netz, Panel, Index
- `data/nodes.json` – alle Punkte (Artists, Labels, Releases). Neue Verbindung = neuer Eintrag hier
- `data/edges.json` – Verbindungen mit Beziehungstyp (`released`, `owns`, `manages`, …) und die Verben in `relations`
- `assets/` – Favicon, OG-Bild, Fotos, Track

Lokal ansehen: `python3 -m http.server` im Ordner, dann http://localhost:8000

Jeder Knoten und jede Kante ist belegt (Discogs, Beatport, Deezer, Labelseiten). Quellen stehen im Knoten unter `links`.
