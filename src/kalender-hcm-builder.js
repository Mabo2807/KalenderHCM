/**
 * kalender-hcm-builder.js
 * SAC Custom Widget: Builder Panel für KalenderHCM
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

    // Liest verfügbare Dimensionen aus dem gebundenen Datensatz.
    // Gibt Array von { id, label } zurück, oder null wenn noch kein Datensatz verbunden.
    _getAvailableColumns() {
      const db = this.dataBinding;
      if (!db) return null;

      const cols = [];

      // Weg 1: metadata.dimensions — vollständige Dimensionsliste mit Beschreibungen
      if (db.metadata && Array.isArray(db.metadata.dimensions) && db.metadata.dimensions.length > 0) {
        for (const dim of db.metadata.dimensions) {
          cols.push({ id: dim.id, label: dim.description || dim.id });
        }
        return cols;
      }

      // Weg 2: Spalten-Keys aus der ersten Datenzeile
      if (db.data && db.data.length > 0) {
        for (const key of Object.keys(db.data[0])) {
          cols.push({ id: key, label: key });
        }
        return cols.length > 0 ? cols : null;
      }

      return null;
    }

    // Rendert entweder ein Dropdown (wenn Dimensionen bekannt) oder ein Text-Input (Fallback).
    _colSelector(id, currentValue, cols, placeholder) {
      if (!cols || cols.length === 0) {
        return `<input type="text" id="${id}" value="${esc(currentValue)}" placeholder="${esc(placeholder)}">`;
      }
      const options = [
        `<option value="">-- Dimension wählen --</option>`,
        ...cols.map(c => {
          const sel = c.id === currentValue ? ' selected' : '';
          return `<option value="${esc(c.id)}"${sel}>${esc(c.label)}</option>`;
        })
      ].join('');
      return `<select id="${id}">${options}</select>`;
    }

    _render() {
      const showWeekends  = this.showWeekends !== false;
      const firstDay      = this.firstDayOfWeek !== undefined ? parseInt(this.firstDayOfWeek, 10) : 1;
      const dateColId     = this.dateColumnId     || '';
      const statusColId   = this.statusColumnId   || '';
      const employeeColId = this.employeeColumnId || '';
      const navUrl        = this.navigationUrl    || '';
      const openInNewTab  = this.openInNewTab !== false;

      const cols = this._getAvailableColumns();
      const noDataHint = cols === null
        ? `<div class="warn-box">Noch kein Datensatz verbunden &mdash; bitte zuerst im <strong>Data-Panel</strong> eine Datenquelle binden. Danach erscheinen hier Dropdowns.</div>`
        : '';

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
          * { box-sizing: border-box; }
          .section { margin-bottom: 16px; }
          .section-title {
            font-size: 11px;
            font-weight: 700;
            color: #556b82;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          label {
            display: block;
            font-size: 12px;
            margin-top: 10px;
            margin-bottom: 3px;
            color: #556b82;
          }
          select, input[type="text"] {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid var(--border);
            border-radius: 4px;
            font-family: inherit;
            font-size: 12px;
            color: #131e29;
            background: #fff;
          }
          select:focus, input[type="text"]:focus {
            outline: none;
            border-color: var(--brand);
            box-shadow: 0 0 0 2px rgba(0,112,242,0.15);
          }
          .required-marker { color: #e76500; margin-left: 2px; }
          .hint {
            font-size: 10px;
            color: #788fa6;
            line-height: 1.4;
            margin-top: 3px;
          }
          .warn-box {
            background: #fff8e8;
            border: 1px solid #f0c040;
            border-radius: 4px;
            padding: 8px 10px;
            font-size: 11px;
            color: #7a5000;
            line-height: 1.5;
            margin-bottom: 10px;
          }
          .info-box {
            background: #fff8e8;
            border: 1px solid #f0c040;
            border-radius: 4px;
            padding: 8px 10px;
            font-size: 11px;
            color: #7a5000;
            line-height: 1.5;
            margin-bottom: 8px;
          }
          .checkbox-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 10px;
          }
          input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--brand); flex-shrink: 0; }
          input[type="text"] { padding: 6px 8px; }
          hr { border: none; border-top: 1px solid var(--border); margin: 14px 0; }
        </style>

        <div class="section">
          <div class="section-title">Dimensionen</div>
          ${noDataHint}

          <label>Datum <span class="required-marker">*</span></label>
          ${this._colSelector('date-col-id', dateColId, cols, 'z.B. Datum oder 0CALDAY')}
          <div class="hint">Datumswerte im Format YYYY-MM-DD</div>

          <label>Status <span class="required-marker">*</span></label>
          ${this._colSelector('status-col-id', statusColId, cols, 'z.B. Anwesenheitsstatus')}
          <div class="hint">z.B. "Anwesend", "Krank", "Urlaub"</div>

          <label>Mitarbeiter</label>
          ${this._colSelector('employee-col-id', employeeColId, cols, 'optional')}
          <div class="hint">Optional &mdash; erscheint im Widget-Header</div>
        </div>

        <hr>

        <div class="section">
          <div class="section-title">Navigation bei Klick</div>
          <div class="info-box">
            Platzhalter: <strong>{date}</strong> = Datum, <strong>{status}</strong> = Status<br>
            Leer lassen um Navigation zu deaktivieren.
          </div>
          <label>URL-Template</label>
          <input type="text" id="nav-url" value="${esc(navUrl)}" placeholder="https://... oder leer lassen">
          <div class="hint">Beispiel: https://example.com/detail?datum={date}</div>
          <div class="checkbox-row">
            <input type="checkbox" id="open-new-tab" ${openInNewTab ? 'checked' : ''}>
            <label for="open-new-tab" style="margin:0;color:#131e29">In neuem Tab &ouml;ffnen</label>
          </div>
        </div>

        <hr>

        <div class="section">
          <div class="section-title">Optionen</div>

          <div class="checkbox-row" style="margin-top:4px">
            <input type="checkbox" id="show-weekends" ${showWeekends ? 'checked' : ''}>
            <label for="show-weekends" style="margin:0;color:#131e29">Wochenenden anzeigen</label>
          </div>

          <label>Erster Wochentag</label>
          <select id="first-day">
            <option value="1" ${firstDay === 1 ? 'selected' : ''}>Montag</option>
            <option value="0" ${firstDay === 0 ? 'selected' : ''}>Sonntag</option>
          </select>
        </div>
      `;

      this._attachListeners();
    }

    _attachListeners() {
      const root = this._shadowRoot;

      const dispatch = (props) => {
        this.dispatchEvent(new CustomEvent('propertiesChanged', {
          detail: { properties: props }
        }));
      };

      // Funktioniert für sowohl <select> als auch <input type="text">
      root.getElementById('date-col-id')?.addEventListener('change', (e) => {
        dispatch({ dateColumnId: e.target.value.trim() });
      });
      root.getElementById('status-col-id')?.addEventListener('change', (e) => {
        dispatch({ statusColumnId: e.target.value.trim() });
      });
      root.getElementById('employee-col-id')?.addEventListener('change', (e) => {
        dispatch({ employeeColumnId: e.target.value.trim() });
      });
      root.getElementById('nav-url')?.addEventListener('change', (e) => {
        dispatch({ navigationUrl: e.target.value.trim() });
      });
      root.getElementById('open-new-tab')?.addEventListener('change', (e) => {
        dispatch({ openInNewTab: e.target.checked });
      });
      root.getElementById('show-weekends')?.addEventListener('change', (e) => {
        dispatch({ showWeekends: e.target.checked });
      });
      root.getElementById('first-day')?.addEventListener('change', (e) => {
        dispatch({ firstDayOfWeek: parseInt(e.target.value, 10) });
      });
    }
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  customElements.define('com-custom-kalenderhcm-builder', KalenderHcmBuilder);
}());
