# Aether

![Aether Logo](assets/aether-logo.svg)

**Dein Tab. Dein Ausgangspunkt.** Eine lokale, tastaturfreundliche Startseite für Brave und Chromium – mit Uhr, Lesezeichen und schneller Suche im Terminal-Look.

## Funktionen

- Ersetzt den neuen Tab in Brave und Chromium
- Durchsuchbare Websuche, Befehle und Lesezeichen
- Lesezeichen direkt aus dem Browser, inklusive Ordnern und Favicons
- Lokale Profile, Themes, Hintergründe und Layout-Einstellungen
- Tastaturbedienung und reduzierte Animationen
- Einstellungen und Daten bleiben lokal im Browser

## Installation

1. Lade dieses Repository herunter und entpacke es.
2. Öffne `brave://extensions` oder `chrome://extensions`.
3. Aktiviere den Entwicklermodus.
4. Wähle **Entpackte Erweiterung laden** und den Projektordner aus.
5. Öffne einen neuen Tab.

## Projektstruktur

```text
manifest.json       Erweiterungsmanifest
newtab.html         Startseite
settings.html       Einstellungsseite
css/                Styles
js/                 Vanilla-JavaScript-Module
fonts/              Lokale Schriftdateien
icons/              Erweiterungsicons
```

Aether verwendet Vanilla HTML, CSS und JavaScript ohne Build-Schritt oder externe Skripte.
