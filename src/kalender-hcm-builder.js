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
      const firstDay = this.firstDayOfWeek !== undefined ? parseInt(this.firstDayOfWeek, 10) : 1;

      if (!this._rendered) {
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
        this._rendered = true;
      } else {
        // Subsequent renders: only update control values, no DOM teardown
        const cb = this._shadowRoot.getElementById('show-weekends');
        if (cb) cb.checked = showWeekends;
        const sel = this._shadowRoot.getElementById('first-day');
        if (sel) sel.value = String(firstDay);
      }
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
