# Scooter Radar – vom Ordner aufs Handy

## Was in diesem Ordner liegt

| Datei | Wofür |
|---|---|
| `index.html` | Die App selbst (Karte, Fahrzeuge, Buchung). Hier änderst du den Code. |
| `version.json` | Versionsnummer. Bei jedem Update hochzählen. |
| `sw.js` | Hintergrund-Helfer: lädt immer die neueste Fassung, speichert sie für offline. Normalerweise nie ändern. |
| `manifest.webmanifest` | Name, Farben und Symbol der App. Damit wird sie installierbar. |
| `icons/` | App-Symbole für den Startbildschirm. |

## Einmalig: App ins Internet stellen (GitHub Pages, kostenlos)

1. Auf **github.com** ein kostenloses Konto anlegen.
2. Oben rechts **+** → **New repository**. Name: `scooter-radar`. **Public** auswählen. **Create repository**.
3. Auf der neuen Seite den Link **uploading an existing file** anklicken.
4. Den **Inhalt** dieses Ordners (alle Dateien und den Ordner `icons`) ins Browserfenster ziehen. Unten **Commit changes**.
5. Im Repository: **Settings** → links **Pages** → bei *Branch* `main` und `/ (root)` wählen → **Save**.
6. Nach 1–2 Minuten steht oben auf der Pages-Seite deine Adresse, etwa
   `https://DEIN-NAME.github.io/scooter-radar/`

## Einmalig: App aufs Handy (Galaxy S25)

1. Die Adresse in **Chrome** auf dem Handy öffnen.
2. Standortfreigabe erlauben.
3. Menü **⋮** → **Zum Startbildschirm hinzufügen** → **Installieren**.
4. Ab jetzt startet die App über ihr Symbol, ohne Browserleiste.

## Bei jeder Änderung (Update)

1. `index.html` ändern und am PC testen.
2. In `version.json` die Nummer hochzählen, z. B. `1.0.0` → `1.0.1`.
3. Auf GitHub im Repository **Add file** → **Upload files** → geänderte Dateien hineinziehen → **Commit changes**.
4. 1–2 Minuten warten. Beim nächsten Start der App auf dem Handy erscheint
   „Aktualisiert auf Version 1.0.1“. Oben neben dem Namen steht immer die aktuelle Version.

## Gut zu wissen

- Jedes hochgeladene Update erreicht sofort **alle**, die die App nutzen. Vorher am PC testen.
- Das Repository ist öffentlich: Jeder kann den Code sehen. Niemals Passwörter oder API-Schlüssel hineinschreiben.
- Ohne Internet startet die App mit der zuletzt gespeicherten Fassung, die Karte braucht aber Netz.
- Kartenkacheln (Esri) und Fußwege (OSRM-Demoserver) sind für Prototypen gedacht. Für eine echte App mit vielen Nutzern braucht man eigene Zugänge (API-Schlüssel) bei einem Kartenanbieter.
