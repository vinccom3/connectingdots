# Connecting Dots

Website für Minoas Cirillo (Mino), Artist-Manager aus Köln. Domain: connectingdots.world. Marke heißt „Connecting Dots", ohne „the". Leitsatz von Mino: „Connecting artists through the world."

Zielpublikum: Labels, Booking-Agenten, Brands. Konkret soll André Hommen (Agent bei Triple One, Berlin) draufschauen und denken: „Okay, das ist krass." Taste wird gezeigt, nicht behauptet.

## Stand

- `index.html` + `src/` – v2 „Universum“ (Vite, Three.js, d3-force-3d), Branch `design/universe`. Offene Punkte in OFFEN.md.
- `legacy/v1.html` – Prototyp v1 (2D-Netz in Ringen), erreichbar unter `/legacy/v1`.
- `public/data/nodes.json`, `public/data/edges.json` – 66 Knoten, 129 Kanten. Alle belegt (Discogs, Beatport, Deezer, Labelseiten). **Daten sind die Wahrheit, nicht anfassen ohne Beleg.**
- Hosting: Vercel, Team geo-beratung, später Transfer an Mino. Jeder Push auf `main` geht live, Branches bekommen Vorschau-URLs.

## Regeln für Daten

- Kanten haben einen Typ aus `relations` (`released`, `owns`, `manages`, `by`, `on`, `remix`, …). Jede Kante muss aus beiden Richtungen richtig lesbar sein.
- „Label des Artists" nur bei Inhaberschaft. Einzige belegte Inhaberschaft: David Hasert → LIKE. Sonst „veröffentlicht auf".
- Abandon ist ein stillgelegtes Projekt (Mino + Timothée Toussaint), als Archiv markiert, ohne Instagram.
- „Two Hands" ist Minos früherer Artist-Name. Nicht auf die Seite.
- Nicht aufnehmen ohne Beleg: Watergate, Crosstown Rebels, Rainy (war ein Transkriptfehler für ReiRei).
- Mino managt David Hasert (Kontakt in Haserts Instagram-Bio: minoas@connectingdots.world).

## Arbeitsweise

- Design-Iterationen auf eigenen Branches (`design/<name>`), Vorschau-URL an Vic schicken, Merge nach `main` erst nach Freigabe.
- Sprache der Seite: Englisch. Kommunikation mit Vic: Deutsch.
- Vor jedem Push lokal im Browser prüfen: Desktop und 390 px Breite, keine Konsolenfehler, 60 fps auf normalem Laptop.
