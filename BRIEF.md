# Brief v2: Das Universum

Baue `index.html` neu als 3D-Erlebnis. Die Daten (`data/nodes.json`, `data/edges.json`) bleiben unverändert und sind die einzige Quelle für Inhalte.

## Das Gefühl

Ein Flug durch ein Universum auf Ketamin: weich, tief, langsam, leicht verschoben. Nichts erklärt sich, alles lässt sich entdecken. Kein Diagramm, keine Ringe, keine Kategorien auf der Fläche. Präzision statt Effekt. Es muss sich teuer anfühlen.

## Ablauf

1. **Ankunft.** Schwarzer Raum. Nur die Wortmarke CONNECTING DOTS, gebaut aus Tausenden leuchtender Punkte, leicht atmend, mit minimaler Tiefe (Punkte haben echte z-Werte, die Schrift wirkt wie aus Staub gegossen). Kein Cursor, keine UI. Absolute Ruhe.
2. **Auflösung.** Passiert, wenn der Besucher scrollt (Scroll treibt den Fortschritt direkt, auch rückwärts) oder wenn nach etwa 6 Sekunden nichts passiert (dann langsam von selbst). Die Schrift zerfällt in den 3D-Raum, die Kamera fährt durch die Punktwolke hinein. Die meisten Punkte werden zu Sternenstaub in der Tiefe. Eine kleine Zahl davon fliegt an feste Positionen und **wird zu den realen Knoten** aus `nodes.json`: Mino im Zentrum, seine Partner nah, Labels weiter weg, Releases als kleine Satelliten ihrer Eltern.
3. **Universum.** Die Knoten schweben in einem echten 3D-Raum, nicht auf einer Ebene. Layout: kraftbasiert in 3D (z. B. d3-force-3d oder eigene Simulation), Gruppen bilden Cluster, Kanten sind feine leuchtende Fäden, die nur aufleuchten, wenn man in der Nähe ist. Die Kamera driftet langsam. Scrollen fährt weiter hinein oder hinaus. Ziehen dreht den Raum.
4. **Der Zeiger ist ein Dot.** Systemcursor ausgeblendet. Der Zeiger ist ein eigener leuchtender Punkt, der erst nach der Auflösung erscheint und mit leichter Trägheit folgt. Kommt er einem Knoten nahe, zieht ein Faden zwischen Zeiger und Knoten, der Name erscheint klein daneben. Der Zeiger ist selbst ein Punkt im Netz.
5. **Fokus.** Klick auf einen Knoten: Kamera fliegt hin (weich, ca. 1,2 s), seine Verbindungen leuchten, eingeklappte Kinder (Releases, Mitglieder) fächern sich räumlich um ihn auf. Seitenpanel wie in v1: Typ, Name, Notiz, Meta, Verbindungen mit Verb, Links. Jede Verbindung im Panel ist anklickbar und fliegt zum Ziel.
6. **Index.** Taste I oder kleiner Schalter: dieselben Daten als nüchterne alphabetische Liste. Für Eilige und für Suchmaschinen.

## Technik

- **Entschieden: Vite + npm.** Three.js, Postprocessing und ggf. d3-force-3d als Abhängigkeiten in `package.json`, Versionen gepinnt. `npm run dev` lokal, `npm run build` erzeugt `dist/`, Vercel erkennt Vite automatisch (Build Command `npm run build`, Output `dist`). `data/*.json` bleiben als statische Dateien in `public/data/` und werden zur Laufzeit per fetch geladen, damit sie ohne Build-Kenntnis änderbar bleiben. Die bisherige `index.html` v1 wandert nach `legacy/v1.html`.
- Partikel als `Points` mit eigenem Shader: weiche runde Punkte, Größe nach Tiefe, additive Blending.
- Postprocessing: Bloom, leichte chromatische Aberration an den Rändern, Filmkorn, Tiefenunschärfe für ferne Punkte. Alles dezent.
- Hintergrund: kein flaches Schwarz, sondern sehr dunkler, langsam fließender Nebel (fbm-Shader wie in v1 als Ausgangspunkt, aber in 3D eingebettet oder als Skybox).
- Farbe: dunkles Violett-Schwarz, Punkte warmweiß, Akzente Lavendel (#c9a9ff) und Mint (#5de0c8) wie in v1. In einer Designrunde später austauschbar, also als Konstanten.
- Schriften: Unbounded (Wortmarke, Panel-Titel), Space Mono (Labels, Daten).
- Mobile: Touch-Ziehen dreht, Pinch zoomt, Tippen fokussiert. Der Dot-Zeiger entfällt am Handy. Partikelzahl auf Mobile reduzieren.
- Performance: 60 fps auf normalem Laptop, unter 2 s bis zur Wortmarke. `prefers-reduced-motion`: Auflösung sofort, keine Kamerafahrten, statisches Universum.
- Barrierefreiheit: Index ist voll per Tastatur bedienbar, Panel hat Fokuszustände.

## Fest bleibt

- Oben links klein: CONNECTING DOTS und minoas@connectingdots.world (erst nach der Auflösung einblenden).
- Unten rechts sehr klein: Quellen der Daten.
- Keine Erklärtexte, keine Kategorien-Labels auf der Fläche.

## Lieferung

- Auf Branch `design/universe` bauen und pushen, Vercel-Vorschau-URL an Vic.
- Kurz notieren, was bewusst offen ist (Sound, Fotos, Impressum).
