# KalenderHCM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a SAC Custom Widget that displays one employee's attendance per month as a color-coded calendar grid, with configurable status colors and a click event for SAC story filtering.

**Architecture:** Standalone Web Component (`com-custom-kalenderhcm`) with Shadow DOM, no external dependencies. CSS loaded via `<link>` with a base-URL trick. SAC lifecycle hooks handle data binding. Builder and Styling panels are separate Web Components.

**Tech Stack:** Vanilla JS (ES6+), HTML/CSS Grid, Web Components API, SAP Fiori Horizon design tokens, GitHub Pages hosting.

---

### Task 1: Project scaffolding

**Files:**
- Create: `KalenderHCM/.gitignore`
- Create: `KalenderHCM/kalender-hcm.json`
- Create: `KalenderHCM/icon.png`
- Create: `KalenderHCM/src/` (empty directory marker)
- Create: `KalenderHCM/test/` (empty directory marker)

**Context:** Working directory is `C:/Users/P10100739/Development/SAPDevelopSAC/KalenderHCM`. Git is already initialized (from brainstorm phase — run `git log` to verify).

- [ ] **Step 1: Create .gitignore**

```
node_modules/
.superpowers/
*.log
.DS_Store
Thumbs.db
```

Save to `C:/Users/P10100739/Development/SAPDevelopSAC/KalenderHCM/.gitignore`

- [ ] **Step 2: Create SAC manifest `kalender-hcm.json`**

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
  "styling": "src/kalender-hcm-styling.js",
  "icon": "icon.png",
  "properties": {
    "currentDate": {
      "type": "string",
      "description": "Angezeigter Monat als ISO-Datum (YYYY-MM-DD)",
      "default": ""
    },
    "colorScheme": {
      "type": "object",
      "description": "Status-Name → Akzentfarbe als { \"Krank\": \"#e76500\" }",
      "default": {}
    },
    "showWeekends": {
      "type": "boolean",
      "description": "Samstag und Sonntag anzeigen",
      "default": true
    },
    "firstDayOfWeek": {
      "type": "integer",
      "description": "Erster Wochentag: 0 = Sonntag, 1 = Montag",
      "default": 1
    }
  },
  "methods": {
    "setMonth": {
      "description": "Zu einem bestimmten Monat navigieren",
      "parameters": [
        {
          "name": "isoDate",
          "type": "string",
          "description": "ISO-Datum-String YYYY-MM-DD"
        }
      ]
    },
    "refresh": {
      "description": "Daten neu laden und Widget neu rendern"
    }
  },
  "events": {
    "onDayClick": {
      "description": "Wird gefeuert wenn ein Tag angeklickt wird. Payload: { date, status }"
    }
  },
  "dataBindings": {
    "attendanceData": {
      "feeds": [
        {
          "id": "dateColumn",
          "description": "Datum-Dimension (YYYY-MM-DD)",
          "type": "dimension",
          "min": 1,
          "max": 1
        },
        {
          "id": "statusColumn",
          "description": "Statuswert (z.B. Krank, Urlaub, Anwesend)",
          "type": "dimension",
          "min": 1,
          "max": 1
        },
        {
          "id": "employeeColumn",
          "description": "Mitarbeitername (optional, für Header-Anzeige)",
          "type": "dimension",
          "min": 0,
          "max": 1
        }
      ]
    }
  }
}
```

Save to `C:/Users/P10100739/Development/SAPDevelopSAC/KalenderHCM/kalender-hcm.json`

- [ ] **Step 3: Create icon.png via Python**

Run this Python command in the `KalenderHCM/` directory to generate a valid 16×16 PNG (SAP-blue calendar icon):

```bash
python3 -c "
import struct, zlib

def make_png(w, h, pixels_rgba):
    def chunk(name, data):
        c = struct.pack('>I', len(data)) + name + data
        return c + struct.pack('>I', zlib.crc32(name + data) & 0xffffffff)
    raw = b''
    for y in range(h):
        raw += b'\\x00'
        for x in range(w):
            raw += bytes(pixels_rgba[y*w+x])
    sig = b'\\x89PNG\\r\\n\\x1a\\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

W, H = 16, 16
B = [0x00, 0x70, 0xf2, 255]   # SAP brand blue
W_ = [255, 255, 255, 255]     # white
T = [0, 0, 0, 0]              # transparent

grid = [
    T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,
    T,B,B,B,B,B,B,B,B,B,B,B,B,B,B,T,
    T,B,W_,W_,W_,W_,W_,W_,W_,W_,W_,W_,W_,W_,B,T,
    T,B,B,B,B,B,B,B,B,B,B,B,B,B,B,T,
    T,B,W_,B,W_,B,W_,B,W_,B,W_,B,W_,B,W_,T,
    T,B,W_,W_,W_,W_,W_,W_,W_,W_,W_,W_,W_,W_,B,T,
    T,B,W_,B,W_,W_,W_,W_,W_,B,W_,W_,W_,W_,B,T,
    T,B,W_,W_,W_,W_,W_,W_,W_,W_,W_,W_,W_,W_,B,T,
    T,B,W_,B,W_,W_,W_,B,W_,W_,W_,W_,W_,W_,B,T,
    T,B,W_,W_,W_,W_,W_,W_,W_,W_,W_,W_,W_,W_,B,T,
    T,B,W_,W_,W_,B,W_,W_,W_,W_,W_,B,W_,W_,B,T,
    T,B,W_,W_,W_,W_,W_,W_,W_,W_,W_,W_,W_,W_,B,T,
    T,B,W_,W_,W_,W_,W_,B,W_,W_,W_,W_,W_,W_,B,T,
    T,B,W_,W_,W_,W_,W_,W_,W_,W_,W_,W_,W_,W_,B,T,
    T,B,B,B,B,B,B,B,B,B,B,B,B,B,B,T,
    T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,
]
with open('icon.png', 'wb') as f:
    f.write(make_png(W, H, grid))
print('icon.png created')
"
```

Run from: `C:/Users/P10100739/Development/SAPDevelopSAC/KalenderHCM/`

Expected output: `icon.png created`

- [ ] **Step 4: Commit scaffolding**

```bash
git add .gitignore kalender-hcm.json icon.png
git commit -m "feat: add project scaffolding — manifest, icon, gitignore"
```

---

### Task 2: Test harness skeleton

**Files:**
- Create: `test/index.html`

**Context:** The test harness imports `../src/kalender-hcm.js` which does not exist yet. All assertions will fail until Task 3 implements the widget. Open in browser after writing to confirm the page loads and shows failures.

- [ ] **Step 1: Write `test/index.html`**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KalenderHCM – Test Harness</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; background: #f0f2f5; }
    .test-panel { background: #fff; border-bottom: 1px solid #ddd; padding: 12px 16px; }
    h2 { margin: 0 0 8px; font-size: 14px; color: #333; }
    .test-result { display: inline-block; padding: 2px 8px; border-radius: 3px; margin: 2px; font-size: 11px; font-family: monospace; }
    .pass { background: #d4edda; color: #155724; }
    .fail { background: #f8d7da; color: #721c24; }
    .controls { margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; }
    .btn { padding: 4px 10px; background: #0070f2; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; }
    .btn:hover { background: #0064d9; }
    .widget-container { padding: 16px; height: calc(100vh - 180px); }
    com-custom-kalenderhcm { display: block; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div class="test-panel">
    <h2>KalenderHCM Test Harness</h2>
    <div id="test-results"></div>
    <div class="controls">
      <button class="btn" onclick="loadMockData()">Mock-Daten laden</button>
      <button class="btn" onclick="clearData()">Daten leeren</button>
      <button class="btn" onclick="navPrev()">‹ Vormonat</button>
      <button class="btn" onclick="navNext()">› Nächster Monat</button>
      <button class="btn" onclick="testNavigation()">Navigation testen</button>
    </div>
  </div>
  <div class="widget-container">
    <com-custom-kalenderhcm id="widget"></com-custom-kalenderhcm>
  </div>

  <script src="../src/kalender-hcm.js"></script>

  <script>
    const resultsEl = document.getElementById('test-results');
    function assert(label, condition) {
      const el = document.createElement('span');
      el.className = 'test-result ' + (condition ? 'pass' : 'fail');
      el.textContent = (condition ? '✓ ' : '✗ ') + label;
      resultsEl.appendChild(el);
      if (!condition) console.error('FAIL:', label);
      return condition;
    }

    // Mock data: April 2025
    const MOCK_STATUS = [
      { date: '2025-04-01', employee: 'Max Mustermann', status: 'Anwesend' },
      { date: '2025-04-02', employee: 'Max Mustermann', status: 'Anwesend' },
      { date: '2025-04-03', employee: 'Max Mustermann', status: 'Anwesend' },
      { date: '2025-04-04', employee: 'Max Mustermann', status: 'Krank' },
      { date: '2025-04-07', employee: 'Max Mustermann', status: 'Krank' },
      { date: '2025-04-08', employee: 'Max Mustermann', status: 'Krank' },
      { date: '2025-04-09', employee: 'Max Mustermann', status: 'Anwesend' },
      { date: '2025-04-10', employee: 'Max Mustermann', status: 'Anwesend' },
      { date: '2025-04-11', employee: 'Max Mustermann', status: 'Anwesend' },
      { date: '2025-04-14', employee: 'Max Mustermann', status: 'Urlaub' },
      { date: '2025-04-15', employee: 'Max Mustermann', status: 'Urlaub' },
      { date: '2025-04-16', employee: 'Max Mustermann', status: 'Urlaub' },
      { date: '2025-04-17', employee: 'Max Mustermann', status: 'Urlaub' },
      { date: '2025-04-18', employee: 'Max Mustermann', status: 'Feiertag' },
      { date: '2025-04-21', employee: 'Max Mustermann', status: 'Feiertag' },
      { date: '2025-04-22', employee: 'Max Mustermann', status: 'Anwesend' },
      { date: '2025-04-23', employee: 'Max Mustermann', status: 'Anwesend' },
      { date: '2025-04-24', employee: 'Max Mustermann', status: 'Anwesend' },
      { date: '2025-04-25', employee: 'Max Mustermann', status: 'Anwesend' },
      { date: '2025-04-28', employee: 'Max Mustermann', status: 'Anwesend' },
      { date: '2025-04-29', employee: 'Max Mustermann', status: 'Anwesend' },
      { date: '2025-04-30', employee: 'Max Mustermann', status: 'Sonstiges' },
    ];

    function loadMockData() {
      const w = document.getElementById('widget');
      // Build statusMap directly (simulates SAC data binding result)
      w._statusMap = new Map(MOCK_STATUS.map(r => [r.date, r.status]));
      w._employeeName = 'Max Mustermann';
      w._currentDate = new Date('2025-04-01');
      w._render();
    }

    function clearData() {
      const w = document.getElementById('widget');
      w._statusMap = new Map();
      w._employeeName = '';
      w._render();
    }

    function navPrev() {
      const w = document.getElementById('widget');
      const d = w._currentDate;
      w.setMonth(new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().slice(0, 10));
    }

    function navNext() {
      const w = document.getElementById('widget');
      const d = w._currentDate;
      w.setMonth(new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10));
    }

    function testNavigation() {
      const w = document.getElementById('widget');
      const startMonth = w._currentDate.getMonth();
      w.setMonth('2025-06-01');
      assert('setMonth() navigates to June', w._currentDate.getMonth() === 5);
      w.setMonth('2025-04-01');
      assert('setMonth() navigates back to April', w._currentDate.getMonth() === 3);
    }

    document.getElementById('widget').addEventListener('onDayClick', (e) => {
      console.log('onDayClick fired:', e.detail);
      alert('onDayClick:\nDatum: ' + e.detail.date + '\nStatus: ' + e.detail.status);
    });

    window.addEventListener('load', () => {
      const widget = document.getElementById('widget');

      // Structure tests
      assert('Widget-Element vorhanden', !!widget);
      assert('Shadow DOM attached', !!widget.shadowRoot);
      assert('setMonth() Methode vorhanden', typeof widget.setMonth === 'function');
      assert('refresh() Methode vorhanden', typeof widget.refresh === 'function');
      assert('_statusMap ist Map', widget._statusMap instanceof Map);

      // Load data and check rendering
      loadMockData();

      setTimeout(() => {
        const shadow = widget.shadowRoot;
        assert('Toolbar gerendert (.hcm-toolbar)', !!shadow.querySelector('.hcm-toolbar'));
        assert('Grid gerendert (.hcm-grid)', !!shadow.querySelector('.hcm-grid'));
        assert('Legende gerendert (.hcm-legend)', !!shadow.querySelector('.hcm-legend'));
        assert('Wochentags-Header gerendert', shadow.querySelectorAll('.hcm-col-header').length === 7);

        const days = shadow.querySelectorAll('.hcm-day:not(.hcm-day--outside)');
        assert('April hat 30 Tageszellen', days.length === 30);

        const statusLabels = shadow.querySelectorAll('.hcm-status-label');
        assert('22 Statuslabels sichtbar (je ein gebundener Tag)', statusLabels.length === 22);

        const todayCell = shadow.querySelector('.hcm-day--today');
        // Today check: only passes if running in April 2025
        // Skip if not current month
        const isApril2025 = new Date().getFullYear() === 2025 && new Date().getMonth() === 3;
        if (isApril2025) {
          assert('Heute-Zelle hat .hcm-day--today', !!todayCell);
        }

        // Click test
        let clickFired = false;
        widget.addEventListener('onDayClick', (e) => {
          if (e.detail.date === '2025-04-04') clickFired = true;
        });
        const april4 = shadow.querySelector('.hcm-day[data-date="2025-04-04"]');
        assert('April 4 Zelle vorhanden', !!april4);
        if (april4) {
          april4.click();
          assert('onDayClick fired bei Klick auf April 4', clickFired);
        }

        // Employee name test
        const title = shadow.querySelector('.hcm-employee');
        assert('Mitarbeitername im Header', !!title && title.textContent.includes('Max Mustermann'));

      }, 100);
    });
  </script>
</body>
</html>
```

- [ ] **Step 2: Open in browser and verify failures**

Open `test/index.html` directly in browser (double-click or `start test/index.html` on Windows).

Expected: Page loads. All `assert()` checks show red (✗) because `kalender-hcm.js` doesn't exist yet.

- [ ] **Step 3: Commit test harness**

```bash
git add test/index.html
git commit -m "test: add test harness skeleton (all assertions fail — widget not yet implemented)"
```

---

### Task 3: CSS

**Files:**
- Create: `src/kalender-hcm.css`

**Context:** The CSS is loaded via `<link rel="stylesheet">` inside Shadow DOM. All class names use the `hcm-` prefix to avoid conflicts. The `:host` block defines SAP Fiori Horizon design tokens.

- [ ] **Step 1: Write `src/kalender-hcm.css`**

```css
/* ==========================================================================
   KalenderHCM — SAP Fiori Horizon Design Tokens & Styles
   ========================================================================== */

:host {
  --sap-brand:          #0070f2;
  --sap-bg:             #f5f6f7;
  --sap-tile-bg:        #ffffff;
  --sap-text:           #131e29;
  --sap-text-secondary: #556b82;
  --sap-border:         #d9d9d9;
  --sap-shell:          #ffffff;
  --sap-negative:       #aa0808;
  font-family: '72', Arial, Helvetica, sans-serif;
  font-size: 14px;
  color: var(--sap-text);
  box-sizing: border-box;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* Root */
.hcm-root {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--sap-tile-bg);
  border-radius: 8px;
  overflow: hidden;
}

/* Toolbar */
.hcm-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--sap-shell);
  border-bottom: 1px solid var(--sap-border);
  flex-shrink: 0;
}

.hcm-nav-btn {
  background: none;
  border: 1px solid var(--sap-border);
  border-radius: 4px;
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 18px;
  color: var(--sap-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding: 0;
}
.hcm-nav-btn:hover {
  background: var(--sap-bg);
  color: var(--sap-brand);
  border-color: var(--sap-brand);
}

.hcm-title-block { text-align: center; }

.hcm-month-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--sap-text);
  display: block;
}

.hcm-employee {
  font-size: 11px;
  color: var(--sap-text-secondary);
  margin-top: 1px;
  display: block;
}

/* Grid wrapper */
.hcm-grid-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px;
  background: var(--sap-bg);
  overflow: auto;
  min-height: 0;
}

/* Day-of-week column headers */
.hcm-col-headers {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 4px;
}

.hcm-col-header {
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--sap-text-secondary);
  padding: 4px 2px;
  user-select: none;
}
.hcm-col-header--weekend { color: var(--sap-negative); }

/* Day grid */
.hcm-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

/* Day cell */
.hcm-day {
  background: var(--sap-tile-bg);
  border-radius: 6px;
  padding: 6px 4px;
  min-height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: box-shadow 0.1s;
  user-select: none;
}
.hcm-day:hover:not(.hcm-day--outside) {
  box-shadow: 0 0 0 2px var(--sap-brand);
  z-index: 1;
  position: relative;
}
.hcm-day--weekend { background: #f0f0f0; }
.hcm-day--today   { box-shadow: 0 0 0 2px var(--sap-brand); }
.hcm-day--outside {
  opacity: 0.4;
  cursor: default;
  background: var(--sap-bg);
}
.hcm-day--outside:hover { box-shadow: none; }

.hcm-day-num {
  font-size: 13px;
  font-weight: 600;
  color: var(--sap-text);
  line-height: 1.4;
}

.hcm-status-label {
  font-size: 10px;
  margin-top: 3px;
  text-align: center;
  line-height: 1.2;
  word-break: break-word;
  max-width: 100%;
}

/* Legend */
.hcm-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  padding: 8px 12px;
  border-top: 1px solid var(--sap-border);
  background: var(--sap-tile-bg);
  flex-shrink: 0;
}

.hcm-legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.hcm-legend-swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  border: 1px solid;
  flex-shrink: 0;
}

.hcm-legend-label { font-size: 11px; }
```

- [ ] **Step 2: Commit CSS**

```bash
git add src/kalender-hcm.css
git commit -m "feat: add SAP Fiori Horizon CSS for HCM calendar"
```

---

### Task 4: Main Widget JS

**Files:**
- Create: `src/kalender-hcm.js`

**Context:** This is the core Web Component. It registers `com-custom-kalenderhcm`. Key patterns from the existing `calendar-widget`:
- `_WIDGET_BASE_URL` derived from `document.currentScript.src` for CSS loading
- SAC lifecycle hook `onCustomWidgetAfterUpdate(changedProperties)` for property + data changes
- Dual event firing: `this.fireEvent()` (SAC runtime) + `dispatchEvent(new CustomEvent(..., { composed: true }))` (test harness)
- Data binding accessed via `this.dataBinding.data` and `this.dataBinding.metadata.feeds`

Color scheme: `colorScheme` stores accent colors (e.g. `{ "Krank": "#e76500" }`). The widget derives cell backgrounds at 12% opacity using `hexToRgb()` + `rgba()`.

After implementing, open `test/index.html` — all assertions should now pass.

- [ ] **Step 1: Write `src/kalender-hcm.js`**

```javascript
/**
 * kalender-hcm.js
 *
 * SAC Custom Widget: KalenderHCM
 * Zeigt Anwesenheitsstatus eines Mitarbeiters als farbigen Monatskalender.
 *
 * Web Component: <com-custom-kalenderhcm>
 */

(function () {
  'use strict';

  // Base URL for CSS <link> inside Shadow DOM
  const _WIDGET_BASE_URL = (function () {
    try {
      return new URL('.', document.currentScript.src).href;
    } catch (e) {
      return '';
    }
  }());

  // Default status colors (accent colors, SAP Fiori palette)
  const DEFAULT_COLOR_SCHEME = {
    'Anwesend': '#256f3a',
    'Krank':    '#e76500',
    'Urlaub':   '#0057d2',
    'Feiertag': '#ba066c',
    'Sonstiges':'#556b82',
  };

  const WEEKDAYS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const MONTHS_DE = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
  ];

  function toISODate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function todayISO() {
    return toISODate(new Date());
  }

  // Convert "#rrggbb" to rgba with given alpha for cell backgrounds
  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // Escape HTML special chars
  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  class KalenderHcm extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: 'open' });
      this._currentDate = new Date();
      this._statusMap = new Map();   // isoDate → status string
      this._colorScheme = {};
      this._showWeekends = true;
      this._firstDayOfWeek = 1;
      this._employeeName = '';
    }

    // -------------------------------------------------------------------------
    // SAC Lifecycle Hooks
    // -------------------------------------------------------------------------

    onCustomWidgetBeforeUpdate(changedProperties) {}

    onCustomWidgetAfterUpdate(changedProperties) {
      if ('currentDate' in changedProperties && this.currentDate) {
        this._currentDate = new Date(this.currentDate);
      }
      if ('colorScheme' in changedProperties) {
        this._colorScheme = this.colorScheme || {};
      }
      if ('showWeekends' in changedProperties) {
        this._showWeekends = this.showWeekends !== false;
      }
      if ('firstDayOfWeek' in changedProperties) {
        this._firstDayOfWeek = this.firstDayOfWeek !== undefined ? this.firstDayOfWeek : 1;
      }
      if ('dataBinding' in changedProperties) {
        this._processDataBinding();
      }
      this._render();
    }

    onCustomWidgetResize() {
      // No resize-specific logic needed for CSS Grid layout
    }

    onCustomWidgetDestroy() {}

    connectedCallback() {
      this._render();
    }

    // -------------------------------------------------------------------------
    // Public Methods (SAC Scripting)
    // -------------------------------------------------------------------------

    setMonth(isoDate) {
      const d = new Date(isoDate);
      if (!isNaN(d)) {
        this._currentDate = d;
        this._render();
      }
    }

    refresh() {
      this._processDataBinding();
      this._render();
    }

    // -------------------------------------------------------------------------
    // SAC Data Binding
    // -------------------------------------------------------------------------

    _processDataBinding() {
      const db = this.dataBinding;
      this._statusMap = new Map();
      this._employeeName = '';

      if (!db || !db.data || db.data.length === 0) return;

      try {
        const meta = db.metadata;
        const dateFeed     = meta.feeds.dateColumn?.values?.[0]?.id;
        const statusFeed   = meta.feeds.statusColumn?.values?.[0]?.id;
        const employeeFeed = meta.feeds.employeeColumn?.values?.[0]?.id;

        if (!dateFeed || !statusFeed) {
          console.warn('KalenderHCM: dateColumn oder statusColumn nicht gebunden.');
          return;
        }

        for (const row of db.data) {
          const date   = String(row[dateFeed]   || '').substring(0, 10);
          const status = String(row[statusFeed] || '');
          if (date && status) {
            this._statusMap.set(date, status);
          }
          if (employeeFeed && !this._employeeName) {
            this._employeeName = String(row[employeeFeed] || '');
          }
        }
      } catch (e) {
        console.error('KalenderHCM: Fehler beim Verarbeiten der Daten:', e);
      }
    }

    // -------------------------------------------------------------------------
    // Effective color scheme: presets merged with user config (user wins)
    // -------------------------------------------------------------------------

    _effectiveColors() {
      return Object.assign({}, DEFAULT_COLOR_SCHEME, this._colorScheme);
    }

    // -------------------------------------------------------------------------
    // Event Firing (SAC + CustomEvent fallback)
    // -------------------------------------------------------------------------

    _fireEvent(eventName, payload) {
      if (typeof this.fireEvent === 'function') {
        this.fireEvent(eventName, payload);
      }
      this.dispatchEvent(new CustomEvent(eventName, {
        detail: payload,
        bubbles: true,
        composed: true,
      }));
    }

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------

    _render() {
      const cssUrl = _WIDGET_BASE_URL + 'kalender-hcm.css';
      const d = this._currentDate;
      const year  = d.getFullYear();
      const month = d.getMonth();          // 0-based
      const today = todayISO();
      const colors = this._effectiveColors();
      const fdow = this._firstDayOfWeek;   // 0=Sun, 1=Mon

      // Calendar math
      const firstOfMonth = new Date(year, month, 1);
      const lastOfMonth  = new Date(year, month + 1, 0);
      const totalDays    = lastOfMonth.getDate();
      const prefill      = (firstOfMonth.getDay() - fdow + 7) % 7;
      const totalCells   = Math.ceil((prefill + totalDays) / 7) * 7;

      // Build ordered weekday names for headers
      const dayNames = [];
      for (let i = 0; i < 7; i++) {
        dayNames.push(WEEKDAYS_DE[(fdow + i) % 7]);
      }

      // Which grid columns (0-6) are weekends
      const weekendCols = new Set();
      for (let i = 0; i < 7; i++) {
        const dow = (fdow + i) % 7;
        if (dow === 0 || dow === 6) weekendCols.add(i);
      }

      // Column headers
      const headersHtml = dayNames.map((name, i) =>
        `<div class="hcm-col-header${weekendCols.has(i) ? ' hcm-col-header--weekend' : ''}">${name}</div>`
      ).join('');

      // Day cells
      let cellsHtml = '';
      for (let i = 0; i < totalCells; i++) {
        const col      = i % 7;
        const dayNum   = i - prefill + 1;   // 1-based day of current month
        const isCurrent = dayNum >= 1 && dayNum <= totalDays;
        const isWeekend = weekendCols.has(col);

        if (!isCurrent) {
          // Dimmed cell for prev/next month days
          let dimDay;
          if (dayNum < 1) {
            dimDay = new Date(year, month, dayNum);
          } else {
            dimDay = new Date(year, month + 1, dayNum - totalDays);
          }
          cellsHtml += `<div class="hcm-day hcm-day--outside"><span class="hcm-day-num">${dimDay.getDate()}</span></div>`;
          continue;
        }

        const isoDate    = toISODate(new Date(year, month, dayNum));
        const status     = this._statusMap.get(isoDate) || '';
        const accentHex  = status ? (colors[status] || '#556b82') : null;
        const bgStyle    = accentHex ? `background:${hexToRgba(accentHex, 0.12)};` : '';
        const isToday    = isoDate === today;

        let classes = 'hcm-day';
        if (isWeekend) classes += ' hcm-day--weekend';
        if (isToday)   classes += ' hcm-day--today';

        const numStyle = isToday
          ? 'color:var(--sap-brand);font-weight:700;'
          : isWeekend
            ? 'color:var(--sap-negative);'
            : '';

        const labelHtml = status
          ? `<div class="hcm-status-label" style="color:${esc(accentHex)}">${esc(status)}</div>`
          : '';

        cellsHtml += `<div class="${classes}" style="${bgStyle}" data-date="${esc(isoDate)}" data-status="${esc(status)}">
          <span class="hcm-day-num" style="${numStyle}">${dayNum}</span>
          ${labelHtml}
        </div>`;
      }

      // Legend — all configured statuses
      const legendHtml = Object.entries(colors).map(([name, hex]) =>
        `<div class="hcm-legend-item">
          <span class="hcm-legend-swatch" style="background:${hexToRgba(hex, 0.15)};border-color:${hex};"></span>
          <span class="hcm-legend-label" style="color:${hex};">${esc(name)}</span>
        </div>`
      ).join('');

      const employeeHtml = this._employeeName
        ? `<span class="hcm-employee">${esc(this._employeeName)}</span>`
        : '';

      this._shadowRoot.innerHTML = `
        <link rel="stylesheet" href="${cssUrl}">
        <div class="hcm-root">
          <div class="hcm-toolbar">
            <button class="hcm-nav-btn" id="btn-prev">&#8249;</button>
            <div class="hcm-title-block">
              <span class="hcm-month-title">${esc(MONTHS_DE[month])} ${year}</span>
              ${employeeHtml}
            </div>
            <button class="hcm-nav-btn" id="btn-next">&#8250;</button>
          </div>
          <div class="hcm-grid-wrap">
            <div class="hcm-col-headers">${headersHtml}</div>
            <div class="hcm-grid">${cellsHtml}</div>
          </div>
          <div class="hcm-legend">${legendHtml}</div>
        </div>
      `;

      this._attachListeners();
    }

    _attachListeners() {
      const root = this._shadowRoot;

      root.getElementById('btn-prev')?.addEventListener('click', () => {
        const d = this._currentDate;
        this._currentDate = new Date(d.getFullYear(), d.getMonth() - 1, 1);
        this._render();
      });

      root.getElementById('btn-next')?.addEventListener('click', () => {
        const d = this._currentDate;
        this._currentDate = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        this._render();
      });

      root.querySelectorAll('.hcm-day[data-date]').forEach(cell => {
        if (!cell.classList.contains('hcm-day--outside')) {
          cell.addEventListener('click', () => {
            this._fireEvent('onDayClick', {
              date:   cell.dataset.date,
              status: cell.dataset.status,
            });
          });
        }
      });
    }
  }

  customElements.define('com-custom-kalenderhcm', KalenderHcm);
}());
```

- [ ] **Step 2: Open `test/index.html` in browser — verify tests pass**

Open `test/index.html` (double-click or `start test/index.html` on Windows).

Expected: All assert() badges are green (✓):
- ✓ Widget-Element vorhanden
- ✓ Shadow DOM attached
- ✓ setMonth() Methode vorhanden
- ✓ refresh() Methode vorhanden
- ✓ _statusMap ist Map
- ✓ Toolbar gerendert (.hcm-toolbar)
- ✓ Grid gerendert (.hcm-grid)
- ✓ Legende gerendert (.hcm-legend)
- ✓ Wochentags-Header gerendert
- ✓ April hat 30 Tageszellen
- ✓ 22 Statuslabels sichtbar
- ✓ April 4 Zelle vorhanden
- ✓ onDayClick fired bei Klick auf April 4
- ✓ Mitarbeitername im Header

If any test fails: check the browser console for JS errors and fix before proceeding.

- [ ] **Step 3: Verify visually in browser**

After tests pass, verify visually:
- Monatsname + Jahr im Header (z.B. "April 2025")
- Mitarbeitername "Max Mustermann" darunter
- ‹ und › Buttons navigieren zu Märs 2025 / Mai 2025
- Tageszellen: grüner BG für Anwesend, orange für Krank, blau für Urlaub, lila für Feiertag
- Wochenenden (Sa/So) grau
- Legende am unteren Rand mit allen 5 Status

- [ ] **Step 4: Commit**

```bash
git add src/kalender-hcm.js
git commit -m "feat: implement KalenderHCM main Web Component

Month grid with status colors, navigation, SAC lifecycle hooks,
data binding processing, onDayClick event."
```

---

### Task 5: Builder Panel

**Files:**
- Create: `src/kalender-hcm-builder.js`

**Context:** The Builder Panel is a Web Component shown in the SAC Story Builder's right panel. Since SAC handles data binding via its own UI (the user drags dimensions to feeds), the builder only needs: a static info box explaining the required feeds, and controls for `showWeekends` and `firstDayOfWeek`. Pattern: `dispatchEvent(new CustomEvent('propertiesChanged', { detail: { properties: { ... } } }))`.

- [ ] **Step 1: Write `src/kalender-hcm-builder.js`**

```javascript
/**
 * kalender-hcm-builder.js
 *
 * SAC Custom Widget: Builder Panel für KalenderHCM
 * Wird im SAC Story Builder (Design-Modus) angezeigt.
 *
 * Web Component: <com-custom-kalenderhcm-builder>
 */

(function () {
  'use strict';

  class KalenderHcmBuilder extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
      this._render();
    }

    onCustomWidgetBeforeUpdate(changedProperties) {}

    onCustomWidgetAfterUpdate(changedProperties) {
      this._render();
    }

    _render() {
      const showWeekends = this.showWeekends !== false;
      const firstDay     = this.firstDayOfWeek !== undefined ? this.firstDayOfWeek : 1;

      this._shadowRoot.innerHTML = `
        <style>
          :host {
            font-family: '72', Arial, sans-serif;
            font-size: 13px;
            color: #131e29;
            --brand: #0070f2;
            --border: #d9d9d9;
            --bg: #f5f6f7;
          }
          .section { margin-bottom: 16px; }
          .section-title {
            font-size: 11px;
            font-weight: 700;
            color: #556b82;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          label { display: block; margin-bottom: 4px; font-size: 12px; }
          select {
            width: 100%;
            padding: 5px 8px;
            border: 1px solid var(--border);
            border-radius: 4px;
            font-family: inherit;
            font-size: 12px;
            color: #131e29;
            background: #fff;
            margin-top: 2px;
          }
          .checkbox-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
          }
          input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--brand); }
          .info-box {
            background: #e8f4fd;
            border: 1px solid #b8d7ff;
            border-radius: 4px;
            padding: 8px 10px;
            font-size: 11px;
            color: #0057d2;
            line-height: 1.5;
          }
          .warn-box {
            background: #fff8e8;
            border: 1px solid #f0c040;
            border-radius: 4px;
            padding: 8px 10px;
            font-size: 11px;
            color: #7a5000;
            line-height: 1.5;
            margin-top: 8px;
          }
          hr { border: none; border-top: 1px solid var(--border); margin: 12px 0; }
        </style>

        <div class="section">
          <div class="section-title">Data Binding</div>
          <div class="info-box">
            Binde Dimensionen über <strong>Daten-Verknüpfung</strong> oben im Story Builder.<br><br>
            Pflicht:<br>
            &bull; <strong>Datum</strong> — Datum-Dimension (YYYY-MM-DD)<br>
            &bull; <strong>Status</strong> — z.B. "Krank", "Urlaub", "Anwesend"<br><br>
            Optional:<br>
            &bull; <strong>Mitarbeiter</strong> — wird im Widget-Header angezeigt
          </div>
          <div class="warn-box">
            ⚠ Statusnamen müssen <strong>exakt</strong> mit den Werten im Styling Panel übereinstimmen (Groß-/Kleinschreibung beachten).
          </div>
        </div>

        <hr>

        <div class="section">
          <div class="section-title">Optionen</div>

          <div class="checkbox-row">
            <input type="checkbox" id="show-weekends" ${showWeekends ? 'checked' : ''}>
            <label for="show-weekends" style="margin:0">Wochenenden anzeigen</label>
          </div>

          <label>
            Erster Wochentag:
            <select id="first-day">
              <option value="1" ${firstDay === 1 ? 'selected' : ''}>Montag</option>
              <option value="0" ${firstDay === 0 ? 'selected' : ''}>Sonntag</option>
            </select>
          </label>
        </div>
      `;

      this._attachListeners();
    }

    _attachListeners() {
      const root = this._shadowRoot;

      root.getElementById('show-weekends')?.addEventListener('change', (e) => {
        this.dispatchEvent(new CustomEvent('propertiesChanged', {
          detail: { properties: { showWeekends: e.target.checked } }
        }));
      });

      root.getElementById('first-day')?.addEventListener('change', (e) => {
        this.dispatchEvent(new CustomEvent('propertiesChanged', {
          detail: { properties: { firstDayOfWeek: parseInt(e.target.value, 10) } }
        }));
      });
    }
  }

  customElements.define('com-custom-kalenderhcm-builder', KalenderHcmBuilder);
}());
```

- [ ] **Step 2: Commit**

```bash
git add src/kalender-hcm-builder.js
git commit -m "feat: add Builder Panel for KalenderHCM"
```

---

### Task 6: Styling Panel

**Files:**
- Create: `src/kalender-hcm-styling.js`

**Context:** The Styling Panel shows configurable status rows (color picker + text name + delete button) and a "+" button. It pre-populates with `DEFAULT_COLOR_SCHEME` presets when `colorScheme` is empty. Also controls `showWeekends` and `firstDayOfWeek`. Each change dispatches `propertiesChanged`. Pattern identical to `calendar-widget/src/calendar-styling.js`.

- [ ] **Step 1: Write `src/kalender-hcm-styling.js`**

```javascript
/**
 * kalender-hcm-styling.js
 *
 * SAC Custom Widget: Styling Panel für KalenderHCM
 * Konfiguriert Status-Farben, Wochenenden-Anzeige und Wochenbeginn.
 *
 * Web Component: <com-custom-kalenderhcm-styling>
 */

(function () {
  'use strict';

  const PRESET_COLORS = {
    'Anwesend': '#256f3a',
    'Krank':    '#e76500',
    'Urlaub':   '#0057d2',
    'Feiertag': '#ba066c',
    'Sonstiges':'#556b82',
  };

  class KalenderHcmStyling extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
      this._render();
    }

    onCustomWidgetBeforeUpdate(changedProperties) {}

    onCustomWidgetAfterUpdate(changedProperties) {
      this._render();
    }

    _render() {
      // If no colorScheme set yet, show presets as starting point
      const colorScheme  = (this.colorScheme && Object.keys(this.colorScheme).length > 0)
        ? this.colorScheme
        : { ...PRESET_COLORS };
      const showWeekends = this.showWeekends !== false;
      const firstDay     = this.firstDayOfWeek !== undefined ? this.firstDayOfWeek : 1;

      const rowsHtml = Object.entries(colorScheme).map(([name, hex]) => `
        <div class="status-row">
          <input type="color" class="color-input" value="${esc(hex)}" data-name="${esc(name)}">
          <input type="text"  class="name-input"  value="${esc(name)}" data-original="${esc(name)}" placeholder="Statusname">
          <button class="remove-btn" data-name="${esc(name)}" title="Entfernen">×</button>
        </div>
      `).join('');

      this._shadowRoot.innerHTML = `
        <style>
          :host {
            font-family: '72', Arial, sans-serif;
            font-size: 13px;
            color: #131e29;
            --brand: #0070f2;
            --border: #d9d9d9;
          }
          .section { margin-bottom: 16px; }
          .section-title {
            font-size: 11px;
            font-weight: 700;
            color: #556b82;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          .status-row {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 6px;
          }
          .color-input {
            width: 30px;
            height: 26px;
            border: 1px solid var(--border);
            border-radius: 3px;
            cursor: pointer;
            padding: 1px;
            flex-shrink: 0;
          }
          .name-input {
            flex: 1;
            padding: 4px 6px;
            border: 1px solid var(--border);
            border-radius: 4px;
            font-family: inherit;
            font-size: 12px;
            color: #131e29;
          }
          .remove-btn {
            background: none;
            border: 1px solid var(--border);
            border-radius: 3px;
            width: 22px;
            height: 22px;
            cursor: pointer;
            font-size: 15px;
            color: #788fa6;
            line-height: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .remove-btn:hover { color: #aa0808; border-color: #aa0808; }
          .add-row {
            display: flex;
            gap: 6px;
            margin-top: 8px;
          }
          .add-input {
            flex: 1;
            padding: 4px 8px;
            border: 1px solid var(--border);
            border-radius: 4px;
            font-family: inherit;
            font-size: 11px;
          }
          .add-btn {
            padding: 4px 10px;
            background: var(--brand);
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
          }
          .add-btn:hover { background: #0064d9; }
          .hint { font-size: 10px; color: #788fa6; line-height: 1.4; margin-top: 4px; }
          label { display: block; font-size: 12px; margin-bottom: 4px; }
          select {
            width: 100%;
            padding: 5px 8px;
            border: 1px solid var(--border);
            border-radius: 4px;
            font-family: inherit;
            font-size: 12px;
            color: #131e29;
            background: #fff;
            margin-top: 2px;
          }
          .checkbox-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
          }
          input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--brand); }
          hr { border: none; border-top: 1px solid var(--border); margin: 12px 0; }
        </style>

        <div class="section">
          <div class="section-title">Status &amp; Farben</div>
          <div id="status-rows">${rowsHtml}</div>
          <div class="add-row">
            <input type="text" class="add-input" id="new-name-input" placeholder="Neuer Status...">
            <button class="add-btn" id="add-btn">+ Hinzufügen</button>
          </div>
          <div class="hint">Statusnamen müssen exakt mit den Werten im SAC-Modell übereinstimmen.</div>
        </div>

        <hr>

        <div class="section">
          <div class="section-title">Einstellungen</div>
          <div class="checkbox-row">
            <input type="checkbox" id="show-weekends" ${showWeekends ? 'checked' : ''}>
            <label for="show-weekends" style="margin:0">Wochenenden anzeigen</label>
          </div>
          <label>
            Erster Wochentag:
            <select id="first-day">
              <option value="1" ${firstDay === 1 ? 'selected' : ''}>Montag</option>
              <option value="0" ${firstDay === 0 ? 'selected' : ''}>Sonntag</option>
            </select>
          </label>
        </div>
      `;

      this._attachListeners(colorScheme);
    }

    _attachListeners(colorScheme) {
      const root = this._shadowRoot;

      // Color picker change
      root.querySelectorAll('.color-input').forEach(input => {
        input.addEventListener('change', () => {
          const updated = { ...colorScheme, [input.dataset.name]: input.value };
          this._dispatchColors(updated);
        });
      });

      // Name field change (rename a status)
      root.querySelectorAll('.name-input').forEach(input => {
        input.addEventListener('change', () => {
          const oldName = input.dataset.original;
          const newName = input.value.trim();
          if (!newName || newName === oldName) return;
          const updated = {};
          for (const [k, v] of Object.entries(colorScheme)) {
            updated[k === oldName ? newName : k] = v;
          }
          this._dispatchColors(updated);
        });
      });

      // Remove button
      root.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const updated = { ...colorScheme };
          delete updated[btn.dataset.name];
          this._dispatchColors(updated);
          this._render();
        });
      });

      // Add new status
      root.getElementById('add-btn')?.addEventListener('click', () => {
        const input = root.getElementById('new-name-input');
        const name  = input.value.trim();
        if (!name || colorScheme[name] !== undefined) return;
        const fallbackColors = ['#0070f2','#d27700','#046c7a','#a100c2','#5d36ff'];
        const idx = Object.keys(colorScheme).length;
        const updated = { ...colorScheme, [name]: fallbackColors[idx % fallbackColors.length] };
        this._dispatchColors(updated);
        input.value = '';
        this._render();
      });

      // showWeekends toggle
      root.getElementById('show-weekends')?.addEventListener('change', (e) => {
        this.dispatchEvent(new CustomEvent('propertiesChanged', {
          detail: { properties: { showWeekends: e.target.checked } }
        }));
      });

      // firstDayOfWeek select
      root.getElementById('first-day')?.addEventListener('change', (e) => {
        this.dispatchEvent(new CustomEvent('propertiesChanged', {
          detail: { properties: { firstDayOfWeek: parseInt(e.target.value, 10) } }
        }));
      });
    }

    _dispatchColors(newScheme) {
      this.colorScheme = newScheme;
      this.dispatchEvent(new CustomEvent('propertiesChanged', {
        detail: { properties: { colorScheme: newScheme } }
      }));
    }
  }

  // Escape for inline HTML attributes
  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  customElements.define('com-custom-kalenderhcm-styling', KalenderHcmStyling);
}());
```

- [ ] **Step 2: Commit**

```bash
git add src/kalender-hcm-styling.js
git commit -m "feat: add Styling Panel — configurable status colors and settings"
```

---

### Task 7: Test data CSV and README

**Files:**
- Create: `test/testdaten.csv`
- Create: `README.md`

- [ ] **Step 1: Write `test/testdaten.csv`**

Cover all 5 default statuses, a full year (2025), German public holidays as "Feiertag", weekends left empty.

```
Datum,Mitarbeiter,Status
2025-01-02,Max Mustermann,Anwesend
2025-01-03,Max Mustermann,Anwesend
2025-01-06,Max Mustermann,Anwesend
2025-01-07,Max Mustermann,Krank
2025-01-08,Max Mustermann,Krank
2025-01-09,Max Mustermann,Krank
2025-01-10,Max Mustermann,Anwesend
2025-01-13,Max Mustermann,Urlaub
2025-01-14,Max Mustermann,Urlaub
2025-01-15,Max Mustermann,Urlaub
2025-01-16,Max Mustermann,Urlaub
2025-01-17,Max Mustermann,Urlaub
2025-01-20,Max Mustermann,Anwesend
2025-01-21,Max Mustermann,Anwesend
2025-01-22,Max Mustermann,Anwesend
2025-01-23,Max Mustermann,Anwesend
2025-01-24,Max Mustermann,Anwesend
2025-01-27,Max Mustermann,Anwesend
2025-01-28,Max Mustermann,Sonstiges
2025-01-29,Max Mustermann,Anwesend
2025-01-30,Max Mustermann,Anwesend
2025-01-31,Max Mustermann,Anwesend
2025-02-03,Max Mustermann,Anwesend
2025-02-04,Max Mustermann,Anwesend
2025-02-05,Max Mustermann,Anwesend
2025-02-06,Max Mustermann,Krank
2025-02-07,Max Mustermann,Krank
2025-02-10,Max Mustermann,Anwesend
2025-02-11,Max Mustermann,Anwesend
2025-02-12,Max Mustermann,Anwesend
2025-02-13,Max Mustermann,Anwesend
2025-02-14,Max Mustermann,Anwesend
2025-02-17,Max Mustermann,Anwesend
2025-02-18,Max Mustermann,Anwesend
2025-02-19,Max Mustermann,Anwesend
2025-02-20,Max Mustermann,Urlaub
2025-02-21,Max Mustermann,Urlaub
2025-02-24,Max Mustermann,Anwesend
2025-02-25,Max Mustermann,Anwesend
2025-02-26,Max Mustermann,Anwesend
2025-02-27,Max Mustermann,Anwesend
2025-02-28,Max Mustermann,Anwesend
2025-03-03,Max Mustermann,Anwesend
2025-03-04,Max Mustermann,Anwesend
2025-03-05,Max Mustermann,Anwesend
2025-03-06,Max Mustermann,Anwesend
2025-03-07,Max Mustermann,Anwesend
2025-03-10,Max Mustermann,Krank
2025-03-11,Max Mustermann,Krank
2025-03-12,Max Mustermann,Anwesend
2025-03-13,Max Mustermann,Anwesend
2025-03-14,Max Mustermann,Anwesend
2025-03-17,Max Mustermann,Anwesend
2025-03-18,Max Mustermann,Anwesend
2025-03-19,Max Mustermann,Anwesend
2025-03-20,Max Mustermann,Feiertag
2025-03-21,Max Mustermann,Anwesend
2025-03-24,Max Mustermann,Anwesend
2025-03-25,Max Mustermann,Anwesend
2025-03-26,Max Mustermann,Anwesend
2025-03-27,Max Mustermann,Anwesend
2025-03-28,Max Mustermann,Anwesend
2025-03-31,Max Mustermann,Anwesend
2025-04-01,Max Mustermann,Anwesend
2025-04-02,Max Mustermann,Anwesend
2025-04-03,Max Mustermann,Anwesend
2025-04-04,Max Mustermann,Krank
2025-04-07,Max Mustermann,Krank
2025-04-08,Max Mustermann,Krank
2025-04-09,Max Mustermann,Anwesend
2025-04-10,Max Mustermann,Anwesend
2025-04-11,Max Mustermann,Anwesend
2025-04-14,Max Mustermann,Urlaub
2025-04-15,Max Mustermann,Urlaub
2025-04-16,Max Mustermann,Urlaub
2025-04-17,Max Mustermann,Urlaub
2025-04-18,Max Mustermann,Feiertag
2025-04-21,Max Mustermann,Feiertag
2025-04-22,Max Mustermann,Anwesend
2025-04-23,Max Mustermann,Anwesend
2025-04-24,Max Mustermann,Anwesend
2025-04-25,Max Mustermann,Anwesend
2025-04-28,Max Mustermann,Anwesend
2025-04-29,Max Mustermann,Anwesend
2025-04-30,Max Mustermann,Sonstiges
2025-05-01,Max Mustermann,Feiertag
2025-05-02,Max Mustermann,Anwesend
2025-05-05,Max Mustermann,Anwesend
2025-05-06,Max Mustermann,Anwesend
2025-05-07,Max Mustermann,Krank
2025-05-08,Max Mustermann,Krank
2025-05-09,Max Mustermann,Anwesend
2025-05-12,Max Mustermann,Anwesend
2025-05-13,Max Mustermann,Anwesend
2025-05-14,Max Mustermann,Anwesend
2025-05-15,Max Mustermann,Anwesend
2025-05-16,Max Mustermann,Anwesend
2025-05-19,Max Mustermann,Anwesend
2025-05-20,Max Mustermann,Anwesend
2025-05-21,Max Mustermann,Anwesend
2025-05-22,Max Mustermann,Anwesend
2025-05-23,Max Mustermann,Anwesend
2025-05-26,Max Mustermann,Feiertag
2025-05-27,Max Mustermann,Anwesend
2025-05-28,Max Mustermann,Anwesend
2025-05-29,Max Mustermann,Anwesend
2025-05-30,Max Mustermann,Anwesend
2025-06-02,Max Mustermann,Urlaub
2025-06-03,Max Mustermann,Urlaub
2025-06-04,Max Mustermann,Urlaub
2025-06-05,Max Mustermann,Urlaub
2025-06-06,Max Mustermann,Urlaub
2025-06-09,Max Mustermann,Anwesend
2025-06-10,Max Mustermann,Anwesend
2025-06-11,Max Mustermann,Anwesend
2025-06-12,Max Mustermann,Anwesend
2025-06-13,Max Mustermann,Anwesend
2025-06-16,Max Mustermann,Anwesend
2025-06-17,Max Mustermann,Anwesend
2025-06-18,Max Mustermann,Anwesend
2025-06-19,Max Mustermann,Feiertag
2025-06-20,Max Mustermann,Anwesend
2025-06-23,Max Mustermann,Anwesend
2025-06-24,Max Mustermann,Anwesend
2025-06-25,Max Mustermann,Anwesend
2025-06-26,Max Mustermann,Anwesend
2025-06-27,Max Mustermann,Anwesend
2025-06-30,Max Mustermann,Anwesend
2025-07-01,Max Mustermann,Anwesend
2025-07-02,Max Mustermann,Krank
2025-07-03,Max Mustermann,Krank
2025-07-04,Max Mustermann,Krank
2025-07-07,Max Mustermann,Anwesend
2025-07-08,Max Mustermann,Urlaub
2025-07-09,Max Mustermann,Urlaub
2025-07-10,Max Mustermann,Urlaub
2025-07-11,Max Mustermann,Urlaub
2025-07-14,Max Mustermann,Urlaub
2025-07-15,Max Mustermann,Urlaub
2025-07-16,Max Mustermann,Urlaub
2025-07-17,Max Mustermann,Urlaub
2025-07-18,Max Mustermann,Urlaub
2025-07-21,Max Mustermann,Anwesend
2025-07-22,Max Mustermann,Anwesend
2025-07-23,Max Mustermann,Anwesend
2025-07-24,Max Mustermann,Anwesend
2025-07-25,Max Mustermann,Anwesend
2025-07-28,Max Mustermann,Anwesend
2025-07-29,Max Mustermann,Anwesend
2025-07-30,Max Mustermann,Anwesend
2025-07-31,Max Mustermann,Anwesend
2025-08-01,Max Mustermann,Anwesend
2025-08-04,Max Mustermann,Anwesend
2025-08-05,Max Mustermann,Sonstiges
2025-08-06,Max Mustermann,Anwesend
2025-08-07,Max Mustermann,Anwesend
2025-08-08,Max Mustermann,Anwesend
2025-08-11,Max Mustermann,Anwesend
2025-08-12,Max Mustermann,Krank
2025-08-13,Max Mustermann,Krank
2025-08-14,Max Mustermann,Anwesend
2025-08-15,Max Mustermann,Anwesend
2025-08-18,Max Mustermann,Anwesend
2025-08-19,Max Mustermann,Anwesend
2025-08-20,Max Mustermann,Anwesend
2025-08-21,Max Mustermann,Anwesend
2025-08-22,Max Mustermann,Anwesend
2025-08-25,Max Mustermann,Anwesend
2025-08-26,Max Mustermann,Anwesend
2025-08-27,Max Mustermann,Anwesend
2025-08-28,Max Mustermann,Anwesend
2025-08-29,Max Mustermann,Anwesend
2025-09-01,Max Mustermann,Anwesend
2025-09-02,Max Mustermann,Anwesend
2025-09-03,Max Mustermann,Anwesend
2025-09-04,Max Mustermann,Anwesend
2025-09-05,Max Mustermann,Anwesend
2025-09-08,Max Mustermann,Urlaub
2025-09-09,Max Mustermann,Urlaub
2025-09-10,Max Mustermann,Urlaub
2025-09-11,Max Mustermann,Urlaub
2025-09-12,Max Mustermann,Urlaub
2025-09-15,Max Mustermann,Anwesend
2025-09-16,Max Mustermann,Anwesend
2025-09-17,Max Mustermann,Anwesend
2025-09-18,Max Mustermann,Anwesend
2025-09-19,Max Mustermann,Anwesend
2025-09-22,Max Mustermann,Anwesend
2025-09-23,Max Mustermann,Anwesend
2025-09-24,Max Mustermann,Anwesend
2025-09-25,Max Mustermann,Anwesend
2025-09-26,Max Mustermann,Anwesend
2025-09-29,Max Mustermann,Anwesend
2025-09-30,Max Mustermann,Anwesend
2025-10-01,Max Mustermann,Anwesend
2025-10-02,Max Mustermann,Anwesend
2025-10-03,Max Mustermann,Feiertag
2025-10-06,Max Mustermann,Anwesend
2025-10-07,Max Mustermann,Anwesend
2025-10-08,Max Mustermann,Krank
2025-10-09,Max Mustermann,Krank
2025-10-10,Max Mustermann,Krank
2025-10-13,Max Mustermann,Anwesend
2025-10-14,Max Mustermann,Anwesend
2025-10-15,Max Mustermann,Anwesend
2025-10-16,Max Mustermann,Anwesend
2025-10-17,Max Mustermann,Anwesend
2025-10-20,Max Mustermann,Anwesend
2025-10-21,Max Mustermann,Anwesend
2025-10-22,Max Mustermann,Sonstiges
2025-10-23,Max Mustermann,Anwesend
2025-10-24,Max Mustermann,Anwesend
2025-10-27,Max Mustermann,Anwesend
2025-10-28,Max Mustermann,Anwesend
2025-10-29,Max Mustermann,Anwesend
2025-10-30,Max Mustermann,Anwesend
2025-10-31,Max Mustermann,Anwesend
2025-11-03,Max Mustermann,Anwesend
2025-11-04,Max Mustermann,Anwesend
2025-11-05,Max Mustermann,Anwesend
2025-11-06,Max Mustermann,Anwesend
2025-11-07,Max Mustermann,Anwesend
2025-11-10,Max Mustermann,Krank
2025-11-11,Max Mustermann,Krank
2025-11-12,Max Mustermann,Anwesend
2025-11-13,Max Mustermann,Anwesend
2025-11-14,Max Mustermann,Anwesend
2025-11-17,Max Mustermann,Urlaub
2025-11-18,Max Mustermann,Urlaub
2025-11-19,Max Mustermann,Urlaub
2025-11-20,Max Mustermann,Urlaub
2025-11-21,Max Mustermann,Urlaub
2025-11-24,Max Mustermann,Anwesend
2025-11-25,Max Mustermann,Anwesend
2025-11-26,Max Mustermann,Anwesend
2025-11-27,Max Mustermann,Anwesend
2025-11-28,Max Mustermann,Anwesend
2025-12-01,Max Mustermann,Anwesend
2025-12-02,Max Mustermann,Anwesend
2025-12-03,Max Mustermann,Anwesend
2025-12-04,Max Mustermann,Anwesend
2025-12-05,Max Mustermann,Anwesend
2025-12-08,Max Mustermann,Anwesend
2025-12-09,Max Mustermann,Anwesend
2025-12-10,Max Mustermann,Anwesend
2025-12-11,Max Mustermann,Anwesend
2025-12-12,Max Mustermann,Anwesend
2025-12-15,Max Mustermann,Anwesend
2025-12-16,Max Mustermann,Anwesend
2025-12-17,Max Mustermann,Sonstiges
2025-12-18,Max Mustermann,Anwesend
2025-12-19,Max Mustermann,Anwesend
2025-12-22,Max Mustermann,Anwesend
2025-12-23,Max Mustermann,Anwesend
2025-12-24,Max Mustermann,Feiertag
2025-12-25,Max Mustermann,Feiertag
2025-12-26,Max Mustermann,Feiertag
2025-12-29,Max Mustermann,Anwesend
2025-12-30,Max Mustermann,Anwesend
2025-12-31,Max Mustermann,Anwesend
```

- [ ] **Step 2: Write `README.md`**

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add test/testdaten.csv README.md
git commit -m "docs: add test data CSV (full year 2025) and README"
```

---

### Task 8: Final verification and push to GitHub

**Files:** None new — verification only.

- [ ] **Step 1: Open `test/index.html` — confirm all tests still pass**

Expected: All ✓ badges green. Click a day → alert shows correct date and status. Navigation buttons change the month title.

- [ ] **Step 2: Verify file structure**

```bash
ls -la
ls src/
ls test/
```

Expected files present:
```
kalender-hcm.json
icon.png
.gitignore
README.md
src/kalender-hcm.js
src/kalender-hcm.css
src/kalender-hcm-builder.js
src/kalender-hcm-styling.js
test/index.html
test/testdaten.csv
docs/superpowers/specs/2026-04-13-kalender-hcm-design.md
docs/superpowers/plans/2026-04-13-kalender-hcm.md
```

- [ ] **Step 3: Create GitHub repository and push**

On GitHub: create new public repository `KalenderHCM`.

```bash
git remote add origin https://github.com/Mabo2807/KalenderHCM.git
git push -u origin master
```

- [ ] **Step 4: Activate GitHub Pages**

GitHub → Settings → Pages → Source: `master`, folder `/ (root)` → Save.

Wait ~2 minutes. Widget is then available at:
```
https://Mabo2807.github.io/KalenderHCM/kalender-hcm.json
```

- [ ] **Step 5: Register widget in SAC**

SAC → Analytic Applications oder Stories → Menü → Custom Widgets → + → URL eingeben:
```
https://Mabo2807.github.io/KalenderHCM/kalender-hcm.json
```
