# v2 Universum: bewusst offen

- **Sound.** `public/audio/birdhouse.mp3` enthält zwei Schnitte hintereinander: das Intro (Takt 1–16, 0:00–0:31, mit Vocals) und den Loop (Takt 55–80, 1:47–2:36, 25 Takte, 48,8 s). Ablauf: Wortmarke wartet auf die erste Geste (Hinweis „sound on“ unten), Geste startet das Intro, Wortmarke hält 8 Takte, zerfällt über 8 Takte, Universum steht beim Übergang in den Loop; der Loop ist sample-genau über einen Web-Audio-Buffer geschleift (Naht = der stille Takt 55). Entschiedenes Scrollen während der Ankunft überspringt (Intro blendet aus, Loop beginnt). Browser erlauben keinen Ton ohne Geste; ein Mausrad allein zählt in Chrome nicht als Geste, dann bleibt die Wortmarke stehen, bis geklickt oder getippt wird. Ohne Datei läuft die Ankunft wie vorher auf Timer. WAV-Master bleibt lokal (`.gitignore`). Offen: HMWL-Freigabe, Vocals im Loop-Abschnitt prüfen (ggf. Takt 56–80 oder anderer Abschnitt), Feinabstimmung der Reaktion.
- **Stream-Links.** Birdhouse hat Spotify (Player verlinkt dorthin). Spotify/Apple-Links für die übrigen Releases ergänzen, sobald belegt.
- **Quellenzeile unten rechts.** Auf Vics Wunsch entfernt (abweichend vom Brief); Quellen stehen je Knoten im Panel.
- **Mailadresse oben links.** Auf Vics Wunsch entfernt (abweichend vom Brief); sie steht als Kontakt im Panel von Minoas Cirillo.
- **Fotos.** Knoten sind reine Punkte. Porträts oder Cover im Panel kommen, sobald Rechte und Dateien da sind.
- **Impressum und Datenschutz.** Fehlen noch. Vor dem Livegang auf connectingdots.world nötig.
- **Sprache der Daten.** Oberfläche ist Englisch, Notizen, Arten („Köln“) und Beziehungsverben in `edges.json` sind noch Deutsch. Übersetzen heißt Daten anfassen, deshalb nicht ohne Freigabe.
- **OG-Bild.** Weiterhin keins (siehe v1).
- **Produktion.** `connectingdots-chi.vercel.app` zeigt v2 aus dem ersten CLI-Deploy; laut Vic egal, wird mit dem nächsten Push auf `main` ersetzt.
- **Feinschliff Layout.** Auf schmalen Geräten können Namen im Fokus am rechten Rand anschneiden.
