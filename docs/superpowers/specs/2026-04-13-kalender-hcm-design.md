# SAC Custom Widget: KalenderHCM — Design Spec

**Datum:** 2026-04-13  
**Status:** Approved  
**Projekt:** `KalenderHCM` (SAP Analytics Cloud Custom Widget)

---

## 1. Ziel

Ein SAC Custom Widget für HCM-Anwesenheitsverfolgung. Es zeigt die Arbeitstage eines Mitarbeiters als klassische Monatsansicht — jeder Tag wird farblich nach seinem Status markiert (z.B. Anwesend, Krank, Urlaub, Feiertag). Die Statuswerte und ihre Farben sind im SAC Styling Panel frei konfigurierbar. Ein Klick auf einen Tag feuert ein SAC-Event für die Story-übergreifende Filterung.

---

## 2. Widget-Typ

**HCM-Anwesenheitskalender** (kein Ereignis-Kalender):

- Ein Datensatz pro Mitarbeiter pro Tag (eine Zeile = ein Tag + ein Status)
- Keine Uhrzeiten, keine Event-Chips — nur farbige Tageszellen
- Primär: ein Mitarbeiter zur Zeit (SAC-seitig per Filter eingeschränkt)
- Navigation zwischen Monaten per Vor/Zurück-Pfeile

---

## 3. Architektur

### Ansatz: Reines HTML/CSS + Vanilla JS

- **HTML/CSS Grid**: 7×6 Kalenderraster (kein ECharts)
- **Web Components**: Shadow DOM, SAC Lifecycle Hooks
- **Keine externen Abhängigkeiten** — vollständig eigenständig

### Dateistruktur

```
KalenderHCM/
├── kalender-hcm.json             # SAC Widget-Manifest
├── icon.png                      # Widget-Icon 16×16
├── .gitignore
├── README.md
├── src/
│   ├── kalender-hcm.js           # Haupt-Web-Component
│   ├── kalender-hcm-builder.js   # Builder Panel (Data Binding)
│   ├── kalender-hcm-styling.js   # Styling Panel (Status + Farben)
│   └── kalender-hcm.css          # Alle Styles (SAP Fiori Horizon)
└── docs/
    └── superpowers/specs/
        └── 2026-04-13-kalender-hcm-design.md
```

---

## 4. SAC-Manifest (`kalender-hcm.json`)

### Identifikation

```json
{
  "id": "com.custom.kalenderhcm",
  "version": "1.0.0",
  "name": "KalenderHCM",
  "description": "HCM-Anwesenheitskalender mit konfigurierbaren Statusfarben für SAP Analytics Cloud",
  "newInstancePrefix": "KalenderHCM",
  "vendor": "",
  "license": "internal use",
  "main": "src/kalender-hcm.js",
  "builder": "src/kalender-hcm-builder.js",
  "styling": "src/kalender-hcm-styling.js"
}
```

### Properties

| Property | Typ | Default | Beschreibung |
|---|---|---|---|
| `currentDate` | `string` | Heute (ISO) | Angezeigter Monat als ISO-Datum-String `"YYYY-MM-DD"` |
| `colorScheme` | `object` | Presets | Status-Name → Hex-Farbe: `{ "Krank": "#e76500" }` |
| `showWeekends` | `boolean` | `true` | Samstag und Sonntag anzeigen |
| `firstDayOfWeek` | `number` | `1` | Wochenbeginn: `1` = Montag, `0` = Sonntag |

**colorScheme-Farbkonvention:** Jede Farbe ist die Akzentfarbe (für Label und Legende). Der Widget leitet die helle Zellhintergrundfarbe automatisch ab (15 % Deckkraft auf weißem Grund).

**Standard-Presets:**

```json
{
  "Anwesend": "#256f3a",
  "Krank":    "#e76500",
  "Urlaub":   "#0057d2",
  "Feiertag": "#ba066c",
  "Sonstiges":"#556b82"
}
```

### Data Binding (im Builder Panel konfigurierbar)

| Binding-Key | SAC-Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `dateColumn` | Datum-Dimension | Ja | Datum des Eintrags (`YYYY-MM-DD`) |
| `statusColumn` | Dimension | Ja | Statuswert, z.B. `"Krank"` |
| `employeeColumn` | Dimension | Nein | Mitarbeitername → wird im Widget-Header angezeigt |

### Methods

| Method | Parameter | Beschreibung |
|---|---|---|
| `setMonth(isoDate)` | ISO-Datum-String | Zu einem bestimmten Monat navigieren |
| `refresh()` | — | Daten neu laden |

### Events

| Event | Payload | Beschreibung |
|---|---|---|
| `onDayClick` | `{ date: string, status: string }` | Tag angeklickt → für SAC-Filterung |

---

## 5. Monatsansicht

- **CSS Grid 7×6** (Mo–So, konfigurierbar via `firstDayOfWeek`)
- **Wochentagsheader**: Mo Di Mi Do Fr Sa So (Sa/So in Rot wenn `showWeekends: true`)
- **Tageszelle:**
  - Hintergrundfarbe = Akzentfarbe des Status bei 15 % Deckkraft
  - Status-Label unterhalb der Tagesnummer (kleine Schrift, Akzentfarbe)
  - Kein Eintrag = neutralgrauer Hintergrund (`#f5f6f7`), kein Label
  - Heute = zusätzlicher blauer Rahmen (`#0070f2`, 2 px) und blaue Tagesnummer
  - Wochenenden = Hintergrund `#f0f0f0`, Tagesnummer rot — Status-Überschreibung hat Vorrang
  - Tage außerhalb des aktuellen Monats (Vor-/Nachmonat) = ausgeblendet (leere Zelle) oder gedimmt
- **Navigation**: `‹` Vorheriger Monat | `Monat Jahr` zentriert | `›` Nächster Monat
- **Mitarbeitername** (wenn `employeeColumn` gebunden): unterhalb des Monat/Jahr-Titels in Sekundärfarbe
- **Legende** am unteren Rand: alle konfigurierten Status als Farbkachel + Name

---

## 6. Interaktionsfluss (Klick auf Tag)

```
Nutzer klickt auf einen Tag
  → Widget feuert SAC-Event: onDayClick { date: "YYYY-MM-DD", status: "Krank" }
  → SAC-Story nutzt Event um andere Widgets zu filtern
```

Tage ohne Eintrag (kein Status) feuern ebenfalls `onDayClick` mit `status: ""`.

---

## 7. Styling (SAP Fiori Horizon Tokens)

```css
--sap-brand:          #0070f2   /* Heute-Rahmen, Primärfarbe */
--sap-bg:             #f5f6f7   /* Seitenhintergrund, leere Tageszellen */
--sap-tile-bg:        #ffffff   /* Widget-Hintergrund */
--sap-text:           #131e29   /* Tagesnummern, Haupttext */
--sap-text-secondary: #556b82   /* Mitarbeitername, Wochentagsheader */
--sap-border:         #d9d9d9   /* Trennlinien */
--sap-shell:          #ffffff   /* Toolbar-Hintergrund */
--sap-negative:       #aa0808   /* Wochenend-Tagesnummern */
```

**Typography:** `'72', Arial, sans-serif`

---

## 8. Builder Panel (`kalender-hcm-builder.js`)

Web Component für den SAC Story Builder (Design-Modus). Enthält:

- Dropdown `dateColumn` → verfügbare Datum-Dimensionen
- Dropdown `statusColumn` → verfügbare Dimensionen
- Dropdown `employeeColumn` → optional, für Header-Anzeige
- Hinweistext: Statusnamen müssen exakt dem Dimensionswert entsprechen

---

## 9. Styling Panel (`kalender-hcm-styling.js`)

Web Component für den SAC Story Styling-Tab. Enthält:

- Liste der konfigurierten Status: je eine Zeile mit Color-Picker + Textfeld (Name) + Löschen-Button (×)
- Button „+ Status hinzufügen" → neue leere Zeile
- Toggle `showWeekends`
- Select `firstDayOfWeek` (Montag / Sonntag)
- Änderungen werden sofort als `propertiesChanged`-Event an SAC gemeldet

---

## 10. Test-Datenmodell (`test/testdaten.csv`)

CSV-Datei für den SAC-Import (lokales Datenmodell):

```
Datum,Mitarbeiter,Status
2025-04-01,Max Mustermann,Anwesend
2025-04-02,Max Mustermann,Anwesend
2025-04-03,Max Mustermann,Anwesend
2025-04-04,Max Mustermann,Krank
...
```

Deckt alle fünf Standardstatus ab, inklusive Feiertagen und Wochenenden.

---

## 11. GitHub Pages Hosting

Gleicher Prozess wie `calendar-widget`:
1. Git-Repository in `KalenderHCM/` initialisieren
2. Auf GitHub pushen (Public Repository)
3. Settings → Pages → Branch `master` → `/root`
4. Widget-URL in SAC: `https://Mabo2807.github.io/KalenderHCM/kalender-hcm.json`

---

## 12. Out of Scope (v1.0)

- Jahres-, Wochen- oder Tagesansicht
- Mehrere Mitarbeiter gleichzeitig (Grid-Ansicht)
- Überlappende Status pro Tag (halber Tag krank, halber Tag Urlaub)
- Export (PDF, CSV)
- Drag & Drop zum Ändern von Status
