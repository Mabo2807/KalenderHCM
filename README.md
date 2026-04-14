# KalenderHCM Widget für SAP Analytics Cloud

Ein Custom Widget für SAP Analytics Cloud (SAC), das Anwesenheitsdaten
eines Mitarbeiters als farbigen Monatskalender anzeigt.

## Ansicht

Klassische Monatsansicht mit farbigen Tageszellen je nach Status
(Anwesend, Krank, Urlaub, Feiertag, Sonstiges — frei konfigurierbar).

## Installation & GitHub Pages Hosting

### Schritt 1: Repository auf GitHub erstellen

1. Gehe zu github.com → **New repository**
2. Name: `KalenderHCM` (Public)
3. Repository erstellen

### Schritt 2: Code hochladen

```bash
git remote add origin https://github.com/Mabo2807/KalenderHCM.git
git push -u origin master
```

### Schritt 3: GitHub Pages aktivieren

Settings → Pages → Source: `master`, Ordner `/ (root)` → Save

Widget-URL:
```
https://Mabo2807.github.io/KalenderHCM/kalender-hcm.json
```

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
