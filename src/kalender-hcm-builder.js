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

    _render() {
      const showWeekends  = this.showWeekends !== false;
      const firstDay      = this.firstDayOfWeek !== undefined ? parseInt(this.firstDayOfWeek, 10) : 1;
      const dateColId     = this.dateColumnId     || '';
      const statusColId   = this.statusColumnId   || '';
      const employeeColId = this.employeeColumnId || '';
      const navUrl        = this.navigationUrl    || '';
      const openInNewTab  = this.openInNewTab !== false;

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
          label {
            display: block;
            font-size: 12px;
            margin-bottom: 2px;
            margin-top: 8px;
            color: #556b82;
          }
          input[type="text"] {
            width: 100%;
            padding: 5px 8px;
            border: 1px solid var(--border);
            border-radius: 4px;
            font-family: inherit;
            font-size: 12px;
            color: #131e29;
            background: #fff;
            box-sizing: border-box;
          }
          input[type="text"]:focus {
            outline: none;
            border-color: var(--brand);
          }
          .required-marker { color: #e76500; }
          .hint {
            font-size: 10px;
            color: #788fa6;
            line-height: 1.4;
            margin-top: 3px;
          }
          .info-box {
            background: #e8f4fd;
            border: 1px solid #b8d7ff;
            border-radius: 4px;
            padding: 8px 10px;
            font-size: 11px;
            color: #0057d2;
            line-height: 1.5;
            margin-bottom: 12px;
          }
          .checkbox-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
            margin-top: 8px;
          }
          input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--brand); }
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
          hr { border: none; border-top: 1px solid var(--border); margin: 12px 0; }
        </style>

        <div class="section">
          <div class="section-title">Datenspalten</div>
          <div class="info-box">
            Trage die technischen Spaltennamen aus deinem SAC-Modell ein.<br>
            Du findest sie im Datensatz unter <strong>Dimensionen &rarr; Technischer Name</strong>.
          </div>

          <label>Datum-Spalte <span class="required-marker">*</span></label>
          <input type="text" id="date-col-id" value="${esc(dateColId)}" placeholder="z.B. Datum oder 0CALDAY">
          <div class="hint">Pflichtfeld &mdash; Datumswerte im Format YYYY-MM-DD</div>

          <label>Status-Spalte <span class="required-marker">*</span></label>
          <input type="text" id="status-col-id" value="${esc(statusColId)}" placeholder="z.B. Status oder Anwesenheitsstatus">
          <div class="hint">Pflichtfeld &mdash; z.B. "Anwesend", "Krank", "Urlaub"</div>

          <label>Mitarbeiter-Spalte</label>
          <input type="text" id="employee-col-id" value="${esc(employeeColId)}" placeholder="z.B. Mitarbeiter (optional)">
          <div class="hint">Optional &mdash; wird im Widget-Header angezeigt</div>
        </div>

        <hr>

        <div class="section">
          <div class="section-title">Navigation bei Klick</div>
          <div class="info-box" style="background:#fff8e8;border-color:#f0c040;color:#7a5000;">
            Optional: URL wird ge&ouml;ffnet wenn ein Tag angeklickt wird.<br>
            Platzhalter: <strong>{date}</strong> = Datum, <strong>{status}</strong> = Status
          </div>
          <label>URL-Template</label>
          <input type="text" id="nav-url" value="${esc(navUrl)}" placeholder="https://... oder leer lassen">
          <div class="hint">Beispiel: https://meinserver.de/details?datum={date}</div>
          <div class="checkbox-row" style="margin-top:6px">
            <input type="checkbox" id="open-new-tab" ${openInNewTab ? 'checked' : ''}>
            <label for="open-new-tab" style="margin:0;color:#131e29">In neuem Tab &ouml;ffnen</label>
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

      const dispatch = (props) => {
        this.dispatchEvent(new CustomEvent('propertiesChanged', {
          detail: { properties: props }
        }));
      };

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
