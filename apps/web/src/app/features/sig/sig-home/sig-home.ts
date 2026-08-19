import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  SigApiService,
  SigDashboard,
  SigIndicador,
  SigObjetivo,
  SigResultado,
} from '../sig-api.service';

type Tab = 'dashboard' | 'mapa' | 'catalogo' | 'captura';

@Component({
  selector: 'app-sig-home',
  imports: [FormsModule],
  template: `
    <section class="page">
      <header class="head">
        <div class="title-wrap">
          <div class="logo-badge">📊</div>
          <div>
            <h2>SIG-KPI · Sistema Integrado de Gestión</h2>
            <p>Cuadro de Mando Integral (CMI) · Coraza Seguridad C.T.A.</p>
          </div>
        </div>
        <nav class="tabs">
          @for (t of tabs; track t.id) {
            <button type="button" [class.on]="tab() === t.id" (click)="go(t.id)">
              {{ t.icon }} {{ t.label }}
            </button>
          }
        </nav>
      </header>

      @if (msg()) {
        <p class="toast">{{ msg() }}</p>
      }

      @if (tab() === 'dashboard') {
        <div class="filter-bar">
          <div class="field">
            <label for="filter-area">Área Estratégica</label>
            <select id="filter-area" [(ngModel)]="area" name="area" (change)="loadDash()">
              <option value="">Todas las Áreas</option>
              <option value="GH">👥 Gestión Humana</option>
              <option value="COMERCIAL">🤝 Comercial / Clientes</option>
              <option value="OPERACIONES">🛡️ Operaciones</option>
              <option value="ADMIN">💼 Administrativo / Financiero</option>
            </select>
          </div>
          <div class="field">
            <label for="filter-anio">Año de Gestión</label>
            <input id="filter-anio" type="number" [(ngModel)]="anio" name="anio" (change)="loadDash()" />
          </div>
        </div>

        <div class="kpis">
          <article class="kpi-card azul">
            <div class="kpi-icon">💎</div>
            <div class="kpi-data">
              <small>Sobresaliente (Azul)</small>
              <b>{{ dash()?.counts?.AZUL || 0 }}</b>
            </div>
          </article>
          <article class="kpi-card verde">
            <div class="kpi-icon">🟢</div>
            <div class="kpi-data">
              <small>Cumple Meta (Verde)</small>
              <b>{{ dash()?.counts?.VERDE || 0 }}</b>
            </div>
          </article>
          <article class="kpi-card amarillo">
            <div class="kpi-icon">🟡</div>
            <div class="kpi-data">
              <small>En Riesgo (Amarillo)</small>
              <b>{{ dash()?.counts?.AMARILLO || 0 }}</b>
            </div>
          </article>
          <article class="kpi-card rojo">
            <div class="kpi-icon">🔴</div>
            <div class="kpi-data">
              <small>Crítico (Rojo)</small>
              <b>{{ dash()?.counts?.ROJO || 0 }}</b>
            </div>
          </article>
          <article class="kpi-card sin-dato">
            <div class="kpi-icon">⚪</div>
            <div class="kpi-data">
              <small>Sin Dato</small>
              <b>{{ dash()?.counts?.SIN_DATO || 0 }}</b>
            </div>
          </article>
        </div>

        <div class="cards-grid">
          @for (it of dash()?.items || []; track it.id) {
            <article class="card" [attr.data-c]="it.color || 'NA'">
              <div class="card-top">
                <span class="code-badge">{{ it.codigo }}</span>
                <span class="dot" [attr.data-c]="it.color || 'NA'">
                  {{ it.color || 'SIN DATO' }}
                </span>
              </div>
              
              <h3 class="card-title">{{ it.nombre }}</h3>
              
              <div class="card-meta">
                <span class="meta-tag">🏢 {{ it.area }}</span>
                <span class="meta-tag">📅 Período: {{ it.periodo || '—' }}</span>
              </div>

              <div class="values-box">
                <div class="val-col">
                  <span class="lbl">Meta</span>
                  <span class="val meta-val">{{ formatNum(it.meta) }}</span>
                </div>
                <div class="val-divider"></div>
                <div class="val-col">
                  <span class="lbl">Resultado</span>
                  <span class="val res-val">{{ formatNum(it.resultado) }}</span>
                </div>
              </div>

              <div class="card-footer">
                <button type="button" class="btn-capturar" (click)="openCaptura(it.id)">
                  ✎ Capturar Resultado
                </button>
              </div>
            </article>
          }
        </div>
      }

      @if (tab() === 'mapa') {
        <div class="mapa-grid">
          @for (p of perspectivas; track p) {
            <section class="perspectiva-card">
              <div class="perspectiva-header">
                <h3>{{ p }}</h3>
              </div>
              <div class="obj-list">
                @for (o of objetivosBy(p); track o.id) {
                  <button type="button" class="obj-btn" (click)="fromMapa(o.id)">
                    <strong>{{ o.objetivoTexto }}</strong>
                    <div class="obj-footer">
                      <span class="sys-badge">{{ o.sistema }}</span>
                      <span class="count-badge">{{ o.indicadoresCount }} indicadores</span>
                    </div>
                  </button>
                }
              </div>
            </section>
          }
        </div>
      }

      @if (tab() === 'catalogo') {
        <div class="filter-bar">
          <div class="field">
            <label for="cat-area">Filtrar por Área</label>
            <select id="cat-area" [(ngModel)]="filtroArea" name="fa" (change)="loadCatalogo()">
              <option value="">Todas las Áreas</option>
              <option value="GH">Gestión Humana</option>
              <option value="COMERCIAL">Comercial</option>
              <option value="OPERACIONES">Operaciones</option>
              <option value="ADMIN">Administrativo</option>
            </select>
          </div>
          <div class="field search-field">
            <label for="cat-q">Buscar Indicador</label>
            <input id="cat-q" [(ngModel)]="q" name="q" placeholder="Buscar por código o nombre..." (keyup)="noop()" />
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre del Indicador</th>
                <th>Área</th>
                <th>Frecuencia</th>
                <th>Sentido</th>
                <th>Estado</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (i of catalogoFiltrado(); track i.id) {
                <tr>
                  <td><strong class="code-badge">{{ i.codigo }}</strong></td>
                  <td><b>{{ i.nombre }}</b></td>
                  <td><span class="meta-tag">{{ i.area }}</span></td>
                  <td>{{ i.frecuencia }}</td>
                  <td>{{ i.sentido }}</td>
                  <td>
                    <span class="status-pill" [class.active]="i.activo">
                      {{ i.activo ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <button type="button" class="btn-action" (click)="openCaptura(i.id)">Capturar</button>
                    <button type="button" class="btn-action outline" (click)="toggleActivo(i)">
                      {{ i.activo ? 'Inactivar' : 'Activar' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (tab() === 'captura') {
        <div class="form-container">
          <div class="form-header">
            <h3>Registro y Captura de Indicador</h3>
            <p>Ingresa la meta y el resultado obtenido en el período correspondiente.</p>
          </div>

          <div class="form-body">
            <label class="form-label">
              <span>Selecciona el Indicador</span>
              <select [(ngModel)]="capturaId" name="cid" (change)="onIndicador()">
                <option value="">-- Seleccionar Indicador --</option>
                @for (i of catalogo(); track i.id) {
                  <option [value]="i.id">{{ i.codigo }} — {{ i.nombre }}</option>
                }
              </select>
            </label>

            @if (sel(); as s) {
              <div class="info-banner">
                <div><strong>Fórmula:</strong> {{ s.formula || 'No especificada' }}</div>
                <div><strong>Frecuencia:</strong> {{ s.frecuencia }} · <strong>Sentido:</strong> {{ s.sentido }}</div>
              </div>

              <div class="grid-2col">
                <label class="form-label">
                  <span>Año de Gestión</span>
                  <input type="number" [(ngModel)]="anio" name="ca" />
                </label>
                <label class="form-label">
                  <span>Período</span>
                  <select [(ngModel)]="periodo" name="cp">
                    @for (p of periodosDe(s.frecuencia); track p) {
                      <option [value]="p">{{ p }}</option>
                    }
                  </select>
                </label>
              </div>

              <div class="grid-2col">
                <label class="form-label">
                  <span>Meta del Período</span>
                  <input type="number" [(ngModel)]="meta" name="cm" step="0.01" />
                </label>
                <label class="form-label">
                  <span>Resultado Obtenido</span>
                  <input type="number" [(ngModel)]="resultado" name="cr" step="0.01" />
                </label>
              </div>

              <label class="form-label">
                <span>Observaciones / Análisis del Resultado</span>
                <textarea [(ngModel)]="obs" name="co" rows="3" placeholder="Ingresa comentarios, causas o detalles sobre el desempeño..."></textarea>
              </label>

              <label class="form-label">
                <span>Estado de Seguimiento</span>
                <select [(ngModel)]="seguimiento" name="cs">
                  <option value="ABIERTO">Abierto</option>
                  <option value="CERRADO">Cerrado</option>
                </select>
              </label>

              @if (color()) {
                <div class="color-preview">
                  <span>Semáforo resultante:</span>
                  <span class="dot big" [attr.data-c]="color()">{{ color() }}</span>
                </div>
              }

              <button type="button" class="btn-save" [disabled]="busy()" (click)="guardar()">
                💾 Guardar Resultado
              </button>

              <div class="hist-section">
                <h4>Historial de Capturas (Año {{ anio }})</h4>
                @for (r of hist(); track r.id) {
                  <div class="hist-row">
                    <span class="hist-period">📅 {{ r.anio }}-{{ r.periodo }}</span>
                    <span class="hist-vals">Meta: <b>{{ formatNum(r.metaSnapshot) }}</b> / Res: <b>{{ formatNum(r.valorResultado) }}</b></span>
                    <span class="dot" [attr.data-c]="r.colorSemaforo">{{ r.colorSemaforo }}</span>
                  </div>
                } @empty {
                  <p class="muted">No hay registros capturados para este año.</p>
                }
              </div>
            }
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .page { display: grid; gap: 1.25rem; font-family: inherit; }
    
    .head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      background: #ffffff;
      padding: 1.25rem 1.5rem;
      border-radius: 1rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .title-wrap { display: flex; align-items: center; gap: 1rem; }
    .logo-badge { font-size: 2rem; background: #eff6ff; padding: 0.5rem 0.75rem; border-radius: 0.75rem; }
    .head h2 { margin: 0 0 0.2rem; font-size: 1.35rem; color: #0f172a; font-weight: 800; }
    .head p { margin: 0; color: #64748b; font-size: 0.88rem; }
    
    .tabs { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .tabs button {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      border-radius: 0.65rem;
      padding: 0.55rem 1rem;
      cursor: pointer;
      font-weight: 700;
      font-size: 0.85rem;
      color: #334155;
      transition: all 0.2s ease;
    }
    .tabs button:hover { background: #e2e8f0; }
    .tabs button.on {
      background: #1e3a8a;
      color: #ffffff;
      border-color: #1e3a8a;
      box-shadow: 0 4px 6px -1px rgba(30, 58, 138, 0.2);
    }

    .toast {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      border-radius: 0.75rem;
      padding: 0.75rem 1rem;
      margin: 0;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      background: #ffffff;
      padding: 1rem 1.25rem;
      border-radius: 0.85rem;
      border: 1px solid #e2e8f0;
      align-items: center;
    }
    .field { display: flex; flex-direction: column; gap: 0.35rem; }
    .field label { font-size: 0.8rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.03em; }
    .field select, .field input {
      font: inherit;
      border: 1px solid #cbd5e1;
      border-radius: 0.55rem;
      padding: 0.5rem 0.85rem;
      color: #0f172a;
      background: #f8fafc;
      font-size: 0.9rem;
      outline: none;
    }
    .field select:focus, .field input:focus { border-color: #2563eb; background: #ffffff; }
    .search-field { flex: 1; min-width: 250px; }

    .kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 0.85rem;
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.85rem;
      padding: 1rem;
      display: flex;
      align-items: center;
      gap: 0.85rem;
      box-shadow: 0 1px 2px rgba(0,0,0,0.02);
      transition: transform 0.2s;
    }
    .kpi-card:hover { transform: translateY(-2px); }
    .kpi-icon { font-size: 1.5rem; }
    .kpi-data small { display: block; font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; }
    .kpi-data b { font-size: 1.6rem; color: #0f172a; font-weight: 900; line-height: 1.1; }
    .kpi-card.azul { border-left: 4px solid #3b82f6; }
    .kpi-card.verde { border-left: 4px solid #22c55e; }
    .kpi-card.amarillo { border-left: 4px solid #eab308; }
    .kpi-card.rojo { border-left: 4px solid #ef4444; }
    .kpi-card.sin-dato { border-left: 4px solid #94a3b8; }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.85rem;
      padding: 1.1rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 0.75rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
      transition: all 0.2s ease;
    }
    .card:hover {
      box-shadow: 0 6px 12px -2px rgba(0,0,0,0.08);
      transform: translateY(-2px);
    }
    .card[data-c='AZUL'] { border-top: 4px solid #3b82f6; }
    .card[data-c='VERDE'] { border-top: 4px solid #22c55e; }
    .card[data-c='AMARILLO'] { border-top: 4px solid #eab308; }
    .card[data-c='ROJO'] { border-top: 4px solid #ef4444; }
    .card[data-c='NA'] { border-top: 4px solid #cbd5e1; }

    .card-top { display: flex; justify-content: space-between; align-items: center; }
    .code-badge {
      font-size: 0.8rem;
      font-weight: 800;
      background: #f1f5f9;
      color: #334155;
      padding: 0.2rem 0.6rem;
      border-radius: 0.4rem;
      border: 1px solid #e2e8f0;
    }
    .dot {
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      background: #e2e8f0;
      letter-spacing: 0.02em;
    }
    .dot[data-c='AZUL'] { background: #dbeafe; color: #1e40af; }
    .dot[data-c='VERDE'] { background: #dcfce7; color: #166534; }
    .dot[data-c='AMARILLO'] { background: #fef9c3; color: #854d0e; }
    .dot[data-c='ROJO'] { background: #fee2e2; color: #991b1b; }
    .dot[data-c='NA'] { background: #f1f5f9; color: #64748b; }
    .dot.big { font-size: 0.95rem; padding: 0.4rem 0.9rem; }

    .card-title {
      margin: 0;
      font-size: 0.98rem;
      font-weight: 800;
      color: #1e293b;
      line-height: 1.35;
      min-height: 2.6rem;
    }

    .card-meta { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .meta-tag {
      font-size: 0.75rem;
      background: #f8fafc;
      color: #64748b;
      padding: 0.15rem 0.5rem;
      border-radius: 0.35rem;
      border: 1px solid #f1f5f9;
      font-weight: 600;
    }

    .values-box {
      display: flex;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 0.65rem;
      padding: 0.6rem 0.85rem;
      justify-content: space-around;
      margin-top: 0.25rem;
    }
    .val-col { display: flex; flex-direction: column; align-items: center; }
    .val-col .lbl { font-size: 0.72rem; color: #64748b; font-weight: 700; text-transform: uppercase; }
    .val-col .val { font-size: 1.05rem; font-weight: 900; }
    .val-col .meta-val { color: #475569; }
    .val-col .res-val { color: #1e3a8a; }
    .val-divider { width: 1px; height: 28px; background: #e2e8f0; }

    .card-footer { margin-top: 0.35rem; }
    .btn-capturar {
      width: 100%;
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      color: #1d4ed8;
      border-radius: 0.55rem;
      padding: 0.5rem;
      font-weight: 700;
      font-size: 0.82rem;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    .btn-capturar:hover { background: #dbeafe; border-color: #93c5fd; }

    .table-container {
      background: #ffffff;
      border-radius: 0.85rem;
      border: 1px solid #e2e8f0;
      overflow-x: auto;
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    th {
      background: #f8fafc;
      padding: 0.75rem 1rem;
      font-weight: 700;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
    }
    td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    tr:hover td { background: #f8fafc; }
    .status-pill {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.15rem 0.55rem;
      border-radius: 999px;
      background: #fee2e2;
      color: #991b1b;
    }
    .status-pill.active { background: #dcfce7; color: #166534; }
    .btn-action {
      border: none;
      background: #eff6ff;
      color: #1d4ed8;
      border-radius: 0.4rem;
      padding: 0.35rem 0.65rem;
      font-weight: 700;
      font-size: 0.78rem;
      cursor: pointer;
      margin-left: 0.35rem;
    }
    .btn-action.outline { background: transparent; border: 1px solid #cbd5e1; color: #475569; }

    .mapa-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; }
    .perspectiva-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.85rem;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .perspectiva-header h3 {
      margin: 0;
      font-size: 1.05rem;
      color: #1e3a8a;
      font-weight: 800;
      border-bottom: 2px solid #eff6ff;
      padding-bottom: 0.5rem;
    }
    .obj-list { display: flex; flex-direction: column; gap: 0.6rem; }
    .obj-btn {
      width: 100%;
      text-align: left;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.65rem;
      padding: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .obj-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }
    .obj-btn strong { display: block; font-size: 0.88rem; color: #1e293b; margin-bottom: 0.4rem; }
    .obj-footer { display: flex; justify-content: space-between; font-size: 0.75rem; }
    .sys-badge { background: #e0e7ff; color: #3730a3; padding: 0.1rem 0.4rem; border-radius: 0.3rem; font-weight: 700; }
    .count-badge { color: #64748b; font-weight: 600; }

    .form-container {
      max-width: 680px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03);
    }
    .form-header h3 { margin: 0 0 0.25rem; font-size: 1.25rem; color: #0f172a; font-weight: 800; }
    .form-header p { margin: 0 0 1.25rem; color: #64748b; font-size: 0.88rem; }
    .form-body { display: flex; flex-direction: column; gap: 1rem; }
    .form-label { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-label span { font-size: 0.82rem; font-weight: 700; color: #334155; }
    .form-label input, .form-label select, .form-label textarea {
      font: inherit;
      border: 1px solid #cbd5e1;
      border-radius: 0.6rem;
      padding: 0.65rem 0.85rem;
      color: #0f172a;
      background: #f8fafc;
    }
    .form-label input:focus, .form-label select:focus, .form-label textarea:focus {
      border-color: #2563eb;
      background: #ffffff;
      outline: none;
    }
    .grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .info-banner {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 0.65rem;
      padding: 0.75rem 1rem;
      font-size: 0.85rem;
      color: #1e40af;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .color-preview {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #f8fafc;
      padding: 0.75rem 1rem;
      border-radius: 0.65rem;
      font-weight: 700;
      color: #334155;
    }
    .btn-save {
      border: none;
      background: #1e3a8a;
      color: #ffffff;
      border-radius: 0.65rem;
      padding: 0.85rem 1.25rem;
      font-weight: 800;
      font-size: 0.95rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-save:hover { background: #172554; }
    .btn-save:disabled { background: #94a3b8; cursor: not-allowed; }

    .hist-section {
      margin-top: 1rem;
      border-top: 1px solid #e2e8f0;
      padding-top: 1rem;
    }
    .hist-section h4 { margin: 0 0 0.75rem; font-size: 0.95rem; color: #1e293b; }
    .hist-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.6rem 0.5rem;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.85rem;
    }
    .hist-period { font-weight: 700; color: #334155; }
    .hist-vals { color: #64748b; }
    .hist-vals b { color: #0f172a; }
    .muted { color: #94a3b8; font-size: 0.85rem; font-style: italic; }
  `,
})
export class SigHome implements OnInit {
  private readonly api = inject(SigApiService);
  readonly tabs: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'mapa', label: 'Mapa Estratégico', icon: '🗺️' },
    { id: 'catalogo', label: 'Catálogo CMI', icon: '📋' },
    { id: 'captura', label: 'Captura / Registro', icon: '✏️' },
  ];
  readonly perspectivas = ['FINANZAS', 'CLIENTES', 'PROCESOS', 'APRENDIZAJE'];
  readonly tab = signal<Tab>('dashboard');
  readonly dash = signal<SigDashboard | null>(null);
  readonly objetivos = signal<SigObjetivo[]>([]);
  readonly catalogo = signal<SigIndicador[]>([]);
  readonly hist = signal<SigResultado[]>([]);
  readonly sel = signal<SigIndicador | null>(null);
  readonly busy = signal(false);
  readonly msg = signal('');
  readonly color = signal('');
  area = '';
  filtroArea = '';
  anio = new Date().getFullYear();
  q = '';
  capturaId = '';
  periodo = '01';
  meta = 0;
  resultado = 0;
  obs = '';
  seguimiento = 'ABIERTO';

  ngOnInit(): void {
    this.loadDash();
    this.loadCatalogo();
    this.api.objetivos().subscribe({ next: (o) => this.objetivos.set(o) });
  }

  go(t: Tab): void {
    this.tab.set(t);
    if (t === 'dashboard') this.loadDash();
    if (t === 'catalogo') this.loadCatalogo();
  }

  noop(): void {
    /* template keyup for q filter */
  }

  formatNum(val: number | string | null | undefined): string {
    if (val === null || val === undefined) return '—';
    const n = Number(val);
    if (isNaN(n)) return '—';
    if (n >= 1_000_000) {
      return `$${(n / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })}M`;
    }
    return n.toLocaleString('es-CO', { maximumFractionDigits: 2 });
  }

  loadDash(): void {
    this.api.dashboard(this.area || undefined, this.anio).subscribe({
      next: (d) => this.dash.set(d),
      error: () => this.msg.set('No se pudo cargar el dashboard'),
    });
  }

  loadCatalogo(): void {
    const q: Record<string, string> = {};
    if (this.filtroArea) q['area'] = this.filtroArea;
    this.api.indicadores(q).subscribe({
      next: (r) => this.catalogo.set(r),
      error: () => this.catalogo.set([]),
    });
  }

  catalogoFiltrado(): SigIndicador[] {
    const term = this.q.trim().toLowerCase();
    if (!term) return this.catalogo();
    return this.catalogo().filter(
      (i) =>
        i.codigo.toLowerCase().includes(term) ||
        i.nombre.toLowerCase().includes(term),
    );
  }

  objetivosBy(p: string): SigObjetivo[] {
    return this.objetivos().filter((o) => o.perspectiva === p);
  }

  fromMapa(objetivoId: string): void {
    this.api.indicadores({ objetivoId }).subscribe({
      next: (r) => {
        this.catalogo.set(r);
        this.filtroArea = '';
        this.tab.set('catalogo');
      },
    });
  }

  openCaptura(id: string): void {
    this.capturaId = id;
    this.tab.set('captura');
    this.onIndicador();
  }

  onIndicador(): void {
    const s = this.catalogo().find((i) => i.id === this.capturaId) || null;
    this.sel.set(s);
    this.color.set('');
    const pers = this.periodosDe(s?.frecuencia || 'MENSUAL');
    this.periodo = pers[0] || '01';
    if (!s) return;
    this.api.resultados(s.id, this.anio).subscribe({
      next: (h) => {
        this.hist.set(h);
        if (h[0]) {
          this.meta = Number(h[0].metaSnapshot);
          this.resultado = Number(h[0].valorResultado);
          this.color.set(h[0].colorSemaforo);
        } else {
          this.meta = 0;
          this.resultado = 0;
        }
      },
    });
  }

  periodosDe(f: string): string[] {
    if (f === 'TRIMESTRAL') return ['T1', 'T2', 'T3', 'T4'];
    if (f === 'SEMESTRAL') return ['S1', 'S2'];
    if (f === 'ANUAL') return ['ANUAL'];
    return ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  }

  toggleActivo(i: SigIndicador): void {
    this.api.patchIndicador(i.id, { activo: !i.activo }).subscribe({
      next: () => {
        this.msg.set(i.activo ? 'Indicador inactivado' : 'Indicador activado');
        this.loadCatalogo();
      },
      error: (e) => this.msg.set(e?.error?.message || 'No se pudo actualizar'),
    });
  }

  guardar(): void {
    const s = this.sel();
    if (!s) return;
    this.busy.set(true);
    this.api
      .capturar({
        indicadorId: s.id,
        anio: Number(this.anio),
        periodo: this.periodo,
        meta: Number(this.meta),
        resultado: Number(this.resultado),
        observaciones: this.obs,
        seguimiento: this.seguimiento,
      })
      .subscribe({
        next: (r) => {
          this.busy.set(false);
          this.color.set(r.colorSemaforo);
          this.msg.set('✅ Resultado guardado exitosamente');
          this.onIndicador();
        },
        error: (e) => {
          this.busy.set(false);
          this.msg.set(e?.error?.message || 'No se pudo guardar el resultado');
        },
      });
  }
}
