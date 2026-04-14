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
      const firstDay     = this.firstDayOfWeek !== undefined ? parseInt(this.firstDayOfWeek, 10) : 1;

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
      this._render();
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
