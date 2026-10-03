# Spielekiste – Änderungen

Jede veröffentlichte Version hat ein Git-Tag (`spiel-x.y`). Ältere Stände lassen sich auf GitHub unter
*Tags* ansehen oder mit `git checkout <tag>` wiederherstellen.

Live: https://astiller1.github.io/spielekiste/

## Kapitän Leo (`leo-…`)
- **1.2** – Alle Sätze mit echter Stimme (ElevenLabs, „Will“), Browserstimme nur noch als Ersatz.
  Große Münzbeträge werden zusammengefasst („ganz viele Münzen“). Grammatik: „noch einen Blaufisch“.
- **1.1** – Neueste Version von claude.ai: Tag und Nacht, Möwe, Wal, Aufträge von Oma Grete,
  Riesen- und Glitzerfische, Endgegner Käpt'n Glubsch, Papagei.
- **1.0** – Erste Veröffentlichung.

## Ellas Babykatzen gegen Babyvampire (`ellas-…`)
- **1.1** – Echte Stimmen (Azure): Seraphina erzählt, Gisela spricht die Katzen und die Babyvampire.
  Katzen rufen bei jeder Fähigkeit etwas. Grammatik „einen Babyvampir“, Tippfehler im Belohnungstext.
- **1.0** – Erste Veröffentlichung.

## Die Wort-Insel (`wort-insel-…`)
- **1.0** – Erste Veröffentlichung, Sprachaufnahmen mit ElevenLabs.

## Asteroiden-Abwehr (`asteroiden-…`)
- **1.1** – Fehler behoben: Startbildschirm und „Schild leer!“ lagen übereinander, das Spiel ließ sich nicht
  starten (auf GitHub fehlte die Regel, die versteckte Fenster ausblendet).
- **1.0** – Erste Veröffentlichung.

## Speiche & Schrott (`speiche-…`)
- **1.0** – Erste Veröffentlichung.

## Werkbank: Das Traumrad (`traumrad-…`)
- **1.0** – Erste Veröffentlichung.

## Zauberwald (`zauberwald-…`)
- **1.0** – Erste Veröffentlichung.

## Startseite (`startseite-…`)
- **1.3** – Zauberwald-Kachel, sieben Spiele.
- **1.2** – Handy-Layout: Viewport, eine Spalte, größere Schrift.
- **1.1** – Kacheln für die zwei Fahrradspiele.
- **1.0** – Landingpage mit vier Spielen.

## Aufbau
- `docs/` – die Website, so wie GitHub Pages sie ausliefert
- `werkzeuge/` – Skripte, mit denen die Sprachaufnahmen erzeugt werden (nicht öffentlich ausgeliefert).
  Die API-Schlüssel liegen **außerhalb** des Repos (`../azure-speech.key`, `../wort-insel/elevenlabs.key`).
