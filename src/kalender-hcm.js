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
