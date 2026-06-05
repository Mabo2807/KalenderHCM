# KalenderHCM Widget für SAP Analytics Cloud

Ein Custom Widget für SAP Analytics Cloud (SAC), das Anwesenheitsdaten
eines Mitarbeiters als farbigen Monatskalender anzeigt.

## Ansicht

Klassische Monatsansicht mit farbigen Tageszellen je nach Status
(Anwesend, Krank, Urlaub, Feiertag, Sonstiges — frei konfigurierbar).

## Installation — Self-contained ZIP-Upload (empfohlen, in SAC gehostet)

Das Widget liegt komplett in SAC — **keine externe URL / kein GitHub** zur Laufzeit
nötig. CSS ist ins JS inlined, alles wird als ZIP hochgeladen.

### Schritt 1: ZIP bauen

```powershell
powershell -ExecutionPolicy Bypass -File build-zip.ps1
```
Erzeugt in `dist/`:
- `kalender-hcm-widget.js` — self-contained Widget (CSS inline)
- `kalender-hcm.zip` — Paket aus Widget-JS + icon.png
- `kalender-hcm-zip.json` — Manifest mit **relativen** Pfaden (`/kalender-hcm-widget.js`, `/icon.png`)

### Schritt 2: In SAC hochladen

1. SAC → **Custom Widgets** → **Hinzufügen / Add**
2. Zuerst die Manifest-JSON wählen: **`dist/kalender-hcm-zip.json`**
3. Wenn SAC nach der Ressourcen-Datei fragt: **`dist/kalender-hcm.zip`** hochladen
4. Fertig — das Widget ist jetzt komplett in SAC gespeichert

### Wichtig: Cross-Widget-Filterung aktivieren

Nach dem Einfügen ins Story:
- Widget anklicken → **Verknüpfte Analyse / Linked Analysis**
- **"All Widgets on the Page"** + ☑️ **"Filter on Data Point Selection"** aktivieren
- Beide Widgets müssen dasselbe Datenmodell verwenden
- Klicks wirken nur im **View-Modus**

### Alternative: GitHub Pages Hosting (Legacy)

Die `kalender-hcm.json` (im Root) verweist auf eine externe GitHub-Pages-URL.
Nur nutzen wenn externes Hosting gewünscht ist — sonst die ZIP-Variante bevorzugen.

## Data Binding

| Feed | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `dateColumn` | Datum-Dimension | Ja | Datum (YYYY-MM-DD) |
| `statusColumn` | Dimension | Ja | Statuswert |
| `employeeColumn` | Dimension | Nein | Mitarbeitername für Header |

## Farben konfigurieren

Im **Styling Panel** (Pinsel-Icon) kannst du Farben pro Status festlegen.
Standard-Status: Anwesend, Krank, Urlaub, Feiertag, Sonstiges.

## SAC Scripting

```javascript
// Zu einem Monat navigieren
KalenderHCM_1.setMonth("2025-06-01");

// Daten neu laden
KalenderHCM_1.refresh();
```

## Auf Klick-Events reagieren

```javascript
KalenderHCM_1.onDayClick = function(event) {
  // event.date   = "2025-04-07"
  // event.status = "Krank"
  Tabelle_1.setFilter("Datum", event.date);
};
```
