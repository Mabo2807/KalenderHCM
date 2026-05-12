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
    'Anwesend': '#256f3a',
    'Krank':    '#e76500',
    'Urlaub':   '#0057d2',
    'Feiertag': '#ba066c',
    'Sonstiges':'#556b82',
  };

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
      this._employeeName = '';

      const db = this.dataBinding;

      // Debug: vollständige Struktur ausgeben
      console.log('KalenderHCM dataBinding:', JSON.stringify(db, null, 2));

      if (!db || !db.data || db.data.length === 0) {
        console.warn('KalenderHCM: Keine Daten im dataBinding.');
        return;
      }

      try {
        const feeds = db.metadata && db.metadata.feeds;
        console.log('KalenderHCM feeds:', JSON.stringify(feeds, null, 2));
        console.log('KalenderHCM erste Datenzeile:', JSON.stringify(db.data[0], null, 2));

        // Feed-ID ermitteln: SAC legt die tatsächliche Dimensions-ID ab
        const dateFeed     = feeds && feeds.dateColumn     && feeds.dateColumn.values     && feeds.dateColumn.values[0]     && feeds.dateColumn.values[0].id;
        const statusFeed   = feeds && feeds.statusColumn   && feeds.statusColumn.values   && feeds.statusColumn.values[0]   && feeds.statusColumn.values[0].id;
        const employeeFeed = feeds && feeds.employeeColumn && feeds.employeeColumn.values && feeds.employeeColumn.values[0] && feeds.employeeColumn.values[0].id;

        console.log('KalenderHCM Feed-IDs:', { dateFeed, statusFeed, employeeFeed });

        if (!dateFeed || !statusFeed) {
          console.warn('KalenderHCM: Datum- oder Status-Feed nicht verbunden.');
          return;
        }

        for (const row of db.data) {
          // SAC kann Werte als String ODER als Objekt {id, label} liefern
          const rawDate   = row[dateFeed];
          const rawStatus = row[statusFeed];

          const dateStr   = rawDate   && typeof rawDate   === 'object' ? (rawDate.id   || rawDate.label || '') : String(rawDate   || '');
          const statusStr = rawStatus && typeof rawStatus === 'object' ? (rawStatus.id || rawStatus.label || '') : String(rawStatus || '');

          // Datum normalisieren: YYYYMMDD → YYYY-MM-DD
          const date = normalizeDateStr(dateStr);
          const status = statusStr.trim();

          if (date && status) this._statusMap.set(date, status);

          if (employeeFeed && !this._employeeName) {
            const rawEmp = row[employeeFeed];
            const empStr = rawEmp && typeof rawEmp === 'object' ? (rawEmp.label || rawEmp.id || '') : String(rawEmp || '');
            this._employeeName = empStr.trim();
          }
        }

        console.log('KalenderHCM statusMap Einträge:', this._statusMap.size);
      } catch (e) {
        console.error('KalenderHCM: Fehler beim Verarbeiten der Daten:', e);
      }
    }

    _effectiveColors() {
      return Object.assign({}, DEFAULT_COLOR_SCHEME, this._colorScheme);
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
      const colors  = this._effectiveColors();
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
        const rawHex    = status ? (colors[status] || '#556b82') : null;
        const accentHex = rawHex && isSafeHex(rawHex) ? rawHex : (status ? '#556b82' : null);
        const bgStyle   = accentHex ? `background:${hexToRgba(accentHex, 0.12)};` : '';
        const isToday   = isoDate === today;

        let classes = 'hcm-day';
        if (isWeekend) classes += ' hcm-day--weekend';
        if (isToday)   classes += ' hcm-day--today';

        const numStyle = isToday
          ? 'color:var(--sap-brand);font-weight:700;'
          : isWeekend ? 'color:var(--sap-negative);' : '';

        const labelHtml = status
          ? `<div class="hcm-status-label" style="color:${esc(accentHex)}">${esc(status)}</div>`
          : '';

        cellsHtml += `<div class="${classes}" style="${bgStyle}" data-date="${esc(isoDate)}" data-status="${esc(status)}">
          <span class="hcm-day-num" style="${numStyle}">${dayNum}</span>
          ${labelHtml}
        </div>`;
      }

      const legendHtml = Object.entries(colors).map(([name, hex]) => {
        const safeHex = isSafeHex(hex) ? hex : '#556b82';
        return `<div class="hcm-legend-item">
          <span class="hcm-legend-swatch" style="background:${hexToRgba(safeHex,0.15)};border-color:${safeHex};"></span>
          <span class="hcm-legend-label" style="color:${safeHex};">${esc(name)}</span>
        </div>`;
      }).join('');

      const employeeHtml = this._employeeName
        ? `<span class="hcm-employee">${esc(this._employeeName)}</span>` : '';

      // Debug-Info zusammenstellen
      const db = this.dataBinding;
      const debugInfo = `dataBinding: ${db ? 'vorhanden' : 'NULL'} | ` +
        `rows: ${db && db.data ? db.data.length : 0} | ` +
        `statusMap: ${this._statusMap.size} | ` +
        `ersteZeile: ${db && db.data && db.data[0] ? JSON.stringify(db.data[0]).substring(0, 120) : 'keine'}`;

      this._shadowRoot.innerHTML = `
        <link rel="stylesheet" href="${cssUrl}">
        <div style="background:#fff3cd;border:1px solid #ffc107;padding:6px 8px;font-size:10px;font-family:monospace;word-break:break-all;margin-bottom:4px;border-radius:4px;">
          🔍 DEBUG: ${debugInfo}
        </div>
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
