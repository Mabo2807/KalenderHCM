/**
 * kalender-hcm.js
 * SAC Custom Widget: KalenderHCM
 * Web Component: <com-custom-kalenderhcm>
 */

(function () {
  'use strict';

  const _WIDGET_BASE_URL = (function () {
    try { return new URL('.', document.currentScript.src).href; } catch (e) { return ''; }
  }());

  const DEFAULT_COLOR_SCHEME = {
    'Anwesend':     '#256f3a',
    'Krank':        '#e76500',
    'Urlaub':       '#0057d2',
    'Feiertag':     '#ba066c',
    'Sonstiges':    '#556b82',
  };

  const DEFAULT_SCHICHT_COLORS = {
    'Frühschicht':    '#b45309',
    'Früh':           '#b45309',
    'Spätschicht':    '#6d28d9',
    'Spät':           '#6d28d9',
    'Normalschicht':  '#0369a1',
    'Normal':         '#0369a1',
  };

  const KNOWN_SCHICHTEN = ['Frühschicht','Früh','Spätschicht','Spät','Normalschicht','Normal'];

  const WEEKDAYS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const MONTHS_DE   = [
    'Januar','Februar','März','April','Mai','Juni',
    'Juli','August','September','Oktober','November','Dezember',
  ];

  function toISODate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function parseISODateLocal(str) {
    const p = str.split('-');
    return new Date(Number(p[0]), Number(p[1])-1, Number(p[2]));
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function esc(str) {
    return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function isSafeHex(v) {
    return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
  }

  // Normalisiert SAC-Datumsformate zu YYYY-MM-DD:
  // "20260401" → "2026-04-01", "2026-04-01" bleibt, "Jan 2, 2025" → "2025-01-02"
  function normalizeDateStr(str) {
    if (!str) return '';
    const s = String(str).trim();
    // Bereits YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
    // YYYYMMDD (SAC-Kalender-Format)
    if (/^\d{8}$/.test(s)) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
    // YYYY/MM/DD
    if (/^\d{4}\/\d{2}\/\d{2}/.test(s)) return s.substring(0, 10).replace(/\//g, '-');
    // Fallback: "Jan 2, 2025" oder andere lokalisierte Formate → Date-Parser
    const d = new Date(s);
    if (!isNaN(d)) return toISODate(d);
    return '';
  }

  class KalenderHcm extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot    = this.attachShadow({ mode: 'open' });
      this._currentDate   = new Date();
      this._statusMap     = new Map();
      this._schichtMap    = new Map();
      this._colorScheme   = {};
      this._employeeName  = '';
      this._navigationUrl = '';
      this._openInNewTab  = true;
      // Hardcoded: Montag als erster Tag, Wochenenden immer sichtbar
      this._firstDayOfWeek = 1;
      this._showWeekends   = true;
    }

    onCustomWidgetBeforeUpdate(changedProperties) {}

    onCustomWidgetAfterUpdate(changedProperties) {
      // Debug: alle geänderten Properties loggen
      console.log('KalenderHCM onCustomWidgetAfterUpdate:', Object.keys(changedProperties));

      if ('currentDate' in changedProperties && this.currentDate) {
        this._currentDate = parseISODateLocal(this.currentDate);
      }
      if ('colorScheme' in changedProperties) {
        try { this._colorScheme = JSON.parse(this.colorScheme || '{}'); } catch (e) { this._colorScheme = {}; }
      }
      if ('navigationUrl' in changedProperties) {
        this._navigationUrl = this.navigationUrl || '';
      }
      if ('openInNewTab' in changedProperties) {
        this._openInNewTab = this.openInNewTab !== false;
      }
      // Daten verarbeiten bei jeder Änderung (dataBinding oder initial)
      this._processDataBinding();
      this._render();
    }

    onCustomWidgetResize() {}
    onCustomWidgetDestroy() {}

    connectedCallback() {
      this._render();
    }

    // Public SAC scripting methods
    setMonth(isoDate) {
      const d = parseISODateLocal(isoDate);
      if (!isNaN(d)) { this._currentDate = d; this._render(); }
    }

    refresh() {
      this._processDataBinding();
      this._render();
    }

    _processDataBinding() {
      this._statusMap    = new Map();
      this._schichtMap   = new Map();
      this._employeeName = '';

      const db = this.dataBinding;
      if (!db) return;

      const rows = Array.isArray(db.data)      ? db.data
                 : Array.isArray(db.rows)      ? db.rows
                 : Array.isArray(db.result)    ? db.result
                 : Array.isArray(db.resultSet) ? db.resultSet
                 : null;

      if (!rows || rows.length === 0) return;

      try {
        const feeds = db.metadata && db.metadata.feeds;

        // Feed-IDs aus SAC-Metadata lesen
        let dateFeedId     = feeds?.dateColumn?.values?.[0]?.id     || null;
        let statusFeedId   = feeds?.statusColumn?.values?.[0]?.id   || null;
        let schichtFeedId  = feeds?.schichtColumn?.values?.[0]?.id  || null;
        let employeeFeedId = feeds?.employeeColumn?.values?.[0]?.id || null;

        // Hilfsfunktion: Wert aus einer Zeile lesen (String oder {id,label}-Objekt)
        const rawVal = (row, key) => {
          const v = row[key];
          if (v === undefined || v === null) return '';
          return typeof v === 'object' ? (v.label || v.id || '') : String(v);
        };

        // Fallback: Spalten automatisch anhand der Werte erkennen
        const KNOWN_STATUSES = ['Anwesend','Krank','Urlaub','Feiertag','Sonstiges'];
        const firstRow = rows[0];
        const keys = Object.keys(firstRow);

        if (!dateFeedId) {
          for (const k of keys) {
            if (normalizeDateStr(rawVal(firstRow, k))) { dateFeedId = k; break; }
          }
        }
        if (!statusFeedId) {
          for (const k of keys) {
            if (k === dateFeedId) continue;
            const v = rawVal(firstRow, k);
            if (KNOWN_STATUSES.some(s => v.includes(s))) { statusFeedId = k; break; }
          }
        }
        if (!schichtFeedId) {
          for (const k of keys) {
            if (k === dateFeedId || k === statusFeedId) continue;
            const v = rawVal(firstRow, k);
            if (KNOWN_SCHICHTEN.some(s => v.includes(s))) { schichtFeedId = k; break; }
          }
        }
        if (!employeeFeedId) {
          for (const k of keys) {
            if (k === dateFeedId || k === statusFeedId || k === schichtFeedId) continue;
            const v = rawVal(firstRow, k);
            if (v && isNaN(Number(v))) { employeeFeedId = k; break; }
          }
        }

        if (!dateFeedId) return;

        for (const row of rows) {
          const date   = normalizeDateStr(rawVal(row, dateFeedId));
          const status = statusFeedId  ? rawVal(row, statusFeedId).trim()  : '';
          const schicht= schichtFeedId ? rawVal(row, schichtFeedId).trim() : '';

          if (date && status)  this._statusMap.set(date, status);
          if (date && schicht) this._schichtMap.set(date, schicht);

          if (employeeFeedId && !this._employeeName) {
            this._employeeName = rawVal(row, employeeFeedId).trim();
          }
        }
      } catch (e) {
        console.error('KalenderHCM: Fehler beim Verarbeiten der Daten:', e);
      }
    }

    _effectiveColors() {
      return Object.assign({}, DEFAULT_COLOR_SCHEME, this._colorScheme);
    }

    _effectiveSchichtColors() {
      return Object.assign({}, DEFAULT_SCHICHT_COLORS, this._colorScheme);
    }

    _fireEvent(eventName, payload) {
      if (typeof this.fireEvent === 'function') this.fireEvent(eventName, payload);
      this.dispatchEvent(new CustomEvent(eventName, { detail: payload, bubbles: true, composed: true }));
    }

    _render() {
      const cssUrl  = _WIDGET_BASE_URL + 'kalender-hcm.css';
      const d       = this._currentDate;
      const year    = d.getFullYear();
      const month   = d.getMonth();
      const today   = toISODate(new Date());
      const colors        = this._effectiveColors();
      const schichtColors = this._effectiveSchichtColors();
      const fdow    = 1; // Montag fest

      const firstOfMonth = new Date(year, month, 1);
      const lastOfMonth  = new Date(year, month + 1, 0);
      const totalDays    = lastOfMonth.getDate();
      const prefill      = (firstOfMonth.getDay() - fdow + 7) % 7;
      const totalCells   = Math.ceil((prefill + totalDays) / 7) * 7;
      const numWeeks     = Math.ceil((prefill + totalDays) / 7);

      const dayNames = [];
      for (let i = 0; i < 7; i++) dayNames.push(WEEKDAYS_DE[(fdow + i) % 7]);

      const weekendCols = new Set();
      for (let i = 0; i < 7; i++) {
        const dow = (fdow + i) % 7;
        if (dow === 0 || dow === 6) weekendCols.add(i);
      }

      const headersHtml = dayNames.map((name, i) =>
        `<div class="hcm-col-header${weekendCols.has(i) ? ' hcm-col-header--weekend' : ''}">${name}</div>`
      ).join('');

      let cellsHtml = '';
      for (let i = 0; i < totalCells; i++) {
        const col       = i % 7;
        const dayNum    = i - prefill + 1;
        const isCurrent = dayNum >= 1 && dayNum <= totalDays;
        const isWeekend = weekendCols.has(col);

        if (!isCurrent) {
          const dimDay = dayNum < 1
            ? new Date(year, month, dayNum)
            : new Date(year, month + 1, dayNum - totalDays);
          cellsHtml += `<div class="hcm-day hcm-day--outside"><span class="hcm-day-num">${dimDay.getDate()}</span></div>`;
          continue;
        }

        const isoDate   = toISODate(new Date(year, month, dayNum));
        const status    = this._statusMap.get(isoDate) || '';
        const schicht   = this._schichtMap.get(isoDate) || '';
        const rawHex    = status ? (colors[status] || '#556b82') : null;
        const accentHex = rawHex && isSafeHex(rawHex) ? rawHex : (status ? '#556b82' : null);
        const bgStyle   = accentHex ? `background:${hexToRgba(accentHex, 0.12)};` : '';
        const isToday   = isoDate === today;

        const rawSchichtHex  = schicht ? (schichtColors[schicht] || '#0e7490') : null;
        const accentSchichtHex = rawSchichtHex && isSafeHex(rawSchichtHex) ? rawSchichtHex : (schicht ? '#0e7490' : null);

        let classes = 'hcm-day';
        if (isWeekend) classes += ' hcm-day--weekend';
        if (isToday)   classes += ' hcm-day--today';

        const numStyle = isToday
          ? 'color:var(--sap-brand);font-weight:700;'
          : isWeekend ? 'color:var(--sap-negative);' : '';

        const labelHtml = status
          ? `<div class="hcm-status-label" style="color:${esc(accentHex)};background:${hexToRgba(accentHex,0.14)};">${esc(status)}</div>`
          : '';

        const schichtHtml = schicht
          ? `<div class="hcm-schicht-label" style="color:${esc(accentSchichtHex)};background:${hexToRgba(accentSchichtHex, 0.08)};">${esc(schicht)}</div>`
          : '';

        cellsHtml += `<div class="${classes}" style="${bgStyle}" data-date="${esc(isoDate)}" data-status="${esc(status)}">
          <span class="hcm-day-num" style="${numStyle}">${dayNum}</span>
          ${labelHtml}
          ${schichtHtml}
        </div>`;
      }

      const statusLegendHtml = Object.entries(DEFAULT_COLOR_SCHEME).map(([name, hex]) => {
        const h = isSafeHex(colors[name] || hex) ? (colors[name] || hex) : '#556b82';
        return `<div class="hcm-legend-item">
          <span class="hcm-legend-swatch" style="background:${hexToRgba(h,0.15)};border-color:${h};"></span>
          <span class="hcm-legend-label" style="color:${h};">${esc(name)}</span>
        </div>`;
      }).join('');

      const schichtLegendHtml = Object.entries(DEFAULT_SCHICHT_COLORS)
        .filter(([name]) => !['Früh','Spät','Normal'].includes(name)) // nur Langformen anzeigen
        .map(([name, hex]) => {
          const h = isSafeHex(schichtColors[name] || hex) ? (schichtColors[name] || hex) : '#0e7490';
          return `<div class="hcm-legend-item">
            <span class="hcm-legend-swatch" style="background:${hexToRgba(h,0.18)};border-color:${h};border-radius:2px;"></span>
            <span class="hcm-legend-label" style="color:${h};font-weight:600;">${esc(name)}</span>
          </div>`;
        }).join('');

      const legendHtml = `${statusLegendHtml}
        <div style="width:100%;height:0;border-top:1px solid var(--sap-border);margin:2px 0;flex-basis:100%;"></div>
        ${schichtLegendHtml}`;

      const employeeHtml = this._employeeName
        ? `<span class="hcm-employee">${esc(this._employeeName)}</span>` : '';

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
            <div class="hcm-col-headers" style="grid-template-columns:repeat(7,1fr)">${headersHtml}</div>
            <div class="hcm-grid" style="grid-template-columns:repeat(7,1fr);grid-template-rows:repeat(${numWeeks},1fr)">${cellsHtml}</div>
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
            const date   = cell.dataset.date;
            const status = cell.dataset.status;
            this._fireEvent('onDayClick', { date, status });
            if (this._navigationUrl) {
              const url = this._navigationUrl
                .replace('{date}',   encodeURIComponent(date))
                .replace('{status}', encodeURIComponent(status));
              this._openInNewTab ? window.open(url, '_blank') : (window.location.href = url);
            }
          });
        }
      });
    }
  }

  customElements.define('com-custom-kalenderhcm', KalenderHcm);
}());
