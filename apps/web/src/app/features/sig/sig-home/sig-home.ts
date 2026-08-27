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

interface SeriePoint {
  periodo: string;
  meta: number;
  resultado: number;
  color: string;
  observaciones: string | null;
  seguimiento: string;
}

interface DashboardItem {
  id: string;
  codigo: string;
  nombre: string;
  area: string;
  frecuencia: string;
  sentido: string;
  color: string | null;
  meta: number | null;
  resultado: number | null;
  periodo: string | null;
  observaciones: string | null;
  seguimiento: string;
  serie: SeriePoint[];
}

@Component({
  selector: 'app-sig-home',
  imports: [FormsModule],
  template: `
    <section class="page">
      <!-- HEADER CON RESUMEN EJECUTIVO -->
      <header class="head">
        <div class="title-wrap">
          <div class="logo-badge" aria-hidden="true">SIG</div>
          <div>
            <h2>SIG-Indicadores · Sistema Integrado de Gestión</h2>
            <p>Tablero de Control Gerencial & Cuadro de Mando · Coraza Seguridad C.T.A.</p>
          </div>
        </div>
        <nav class="tabs">
          @for (t of tabs; track t.id) {
            <button type="button" [class.on]="tab() === t.id" (click)="go(t.id)">
              {{ t.label }}
            </button>
          }
        </nav>
      </header>

      @if (msg()) {
        <p class="toast">{{ msg() }}</p>
      }

      @if (tab() === 'dashboard') {
        <!-- BARRA DE FILTROS -->
        <div class="filter-bar">
          <div class="field">
            <label for="filter-area">Área Estratégica</label>
            <select id="filter-area" [(ngModel)]="area" name="area" (change)="loadDash()">
              <option value="">Todas las Áreas (44 Indicadores)</option>
              <option value="GH"> Gestión Humana</option>
              <option value="SISTEMAS"> Seguridad Electrónica & Sistemas</option>
              <option value="SST"> SST / Salud y Seguridad & PESV</option>
              <option value="OPERACIONES"> Operaciones y Puestos</option>
              <option value="COMERCIAL"> Comercial / Clientes</option>
              <option value="ADMIN"> Administrativo / Financiero</option>
              <option value="CALIDAD"> Calidad, BASC & Auditoría</option>
              <option value="DOTACION"> Dotación e Inventario</option>
              <option value="DOCUMENTAL"> Gestión Documental & Archivo</option>
              <option value="RECEPCION"> Recepción & Control de Acceso</option>
            </select>
          </div>
          <div class="field">
            <label for="filter-anio">Año de Gestión</label>
            <input id="filter-anio" type="number" [(ngModel)]="anio" name="anio" (change)="loadDash()" />
          </div>
          <div class="global-kpi-pill">
            <div class="gauge-ring">
              <span class="pct-num">{{ globalEficacia() }}%</span>
            </div>
            <div class="gauge-info">
              <strong>Índice Global de Eficacia SIG</strong>
              <small>{{ totalCumplen() }} de {{ totalEvaluados() }} metas cumplidas</small>
            </div>
          </div>
          <div class="field btn-sync-col">
            <label>&nbsp;</label>
            <button
              type="button"
              class="btn-sync-sig"
              (click)="autoCalcularSig()"
              [disabled]="syncingSig()"
              title="Calcula automáticamente métricas desde RRHH, Programación, Recepción y Gestión Documental"
            >
               {{ syncingSig() ? 'Calculando...' : 'Auto-Calcular Operaciones' }}
            </button>
          </div>
        </div>

        <!-- KPI SUMMARY CARDS -->
        <div class="kpis">
          <article class="kpi-card azul">
            <div class="kpi-icon" aria-hidden="true"></div>
            <div class="kpi-data">
              <small>Sobresaliente (Azul)</small>
              <b>{{ dash()?.counts?.AZUL || 0 }}</b>
              <div class="mini-prog"><div class="mini-bar bg-blue" [style.width.%]="pctCount('AZUL')"></div></div>
            </div>
          </article>
          <article class="kpi-card verde">
            <div class="kpi-icon" aria-hidden="true"></div>
            <div class="kpi-data">
              <small>Cumple Meta (Verde)</small>
              <b>{{ dash()?.counts?.VERDE || 0 }}</b>
              <div class="mini-prog"><div class="mini-bar bg-green" [style.width.%]="pctCount('VERDE')"></div></div>
            </div>
          </article>
          <article class="kpi-card amarillo">
            <div class="kpi-icon" aria-hidden="true"></div>
            <div class="kpi-data">
              <small>En Riesgo (Amarillo)</small>
              <b>{{ dash()?.counts?.AMARILLO || 0 }}</b>
              <div class="mini-prog"><div class="mini-bar bg-yellow" [style.width.%]="pctCount('AMARILLO')"></div></div>
            </div>
          </article>
          <article class="kpi-card rojo">
            <div class="kpi-icon" aria-hidden="true"></div>
            <div class="kpi-data">
              <small>Crítico (Rojo)</small>
              <b>{{ dash()?.counts?.ROJO || 0 }}</b>
              <div class="mini-prog"><div class="mini-bar bg-red" [style.width.%]="pctCount('ROJO')"></div></div>
            </div>
          </article>
          <article class="kpi-card sin-dato">
            <div class="kpi-icon" aria-hidden="true"></div>
            <div class="kpi-data">
              <small>Sin Dato</small>
              <b>{{ dash()?.counts?.SIN_DATO || 0 }}</b>
              <div class="mini-prog"><div class="mini-bar bg-gray" [style.width.%]="pctCount('SIN_DATO')"></div></div>
            </div>
          </article>
        </div>

        <!-- TARJETAS DE INDICADORES CON GRÁFICOS Y ANÁLISIS DE RESULTADOS -->
        <div class="cards-grid">
          @for (it of dash()?.items || []; track it.id) {
            <article class="card" [attr.data-c]="it.color || 'NA'">
              <!-- TOP: Código y Semáforo -->
              <div class="card-top">
                <span class="code-badge">{{ it.codigo }}</span>
                <span class="dot" [attr.data-c]="it.color || 'NA'">
                  {{ it.color || 'SIN DATO' }}
                </span>
              </div>
              
              <!-- TÍTULO -->
              <h3 class="card-title">{{ it.nombre }}</h3>
              
              <!-- METADATOS -->
              <div class="card-meta">
                <span class="meta-tag"> {{ formatAreaLabel(it.area) }}</span>
                <span class="meta-tag"> {{ it.periodo || '—' }} ({{ it.frecuencia }})</span>
                <span class="meta-tag font-mono">{{ it.sentido === 'ASCENDENTE' ? ' Creciente' : ' Decreciente' }}</span>
              </div>

              <!-- CAJA DE VALORES -->
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
                <div class="val-divider"></div>
                <div class="val-col">
                  <span class="lbl">Cumplimiento</span>
                  <span class="val pct-val" [attr.data-c]="it.color || 'NA'">
                    {{ calcPct(it) }}
                  </span>
                </div>
              </div>

              <!-- BARRA DE PROGRESO VISUAL -->
              <div class="progress-container">
                <div class="progress-track">
                  <div class="progress-fill" [attr.data-c]="it.color || 'NA'" [style.width.%]="calcBarWidth(it)"></div>
                </div>
              </div>

              <!-- MINI GRÁFICO HISTÓRICO (SPARKLINE DE BARRAS) -->
              @if (it.serie && it.serie.length > 0) {
                <div class="sparkline-box">
                  <span class="sparkline-title">Tendencia del período ({{ it.serie.length }} registros):</span>
                  <div class="bars-row">
                    @for (pt of it.serie; track pt.periodo) {
                      <div class="bar-col" [title]="'Período ' + pt.periodo + ': ' + formatNum(pt.resultado) + ' (Meta: ' + formatNum(pt.meta) + ')'">
                        <div class="bar-stem">
                          <div class="bar-cap" [attr.data-c]="pt.color" [style.height.px]="calcBarHeight(pt.resultado, it.meta)"></div>
                        </div>
                        <span class="bar-lbl">{{ pt.periodo }}</span>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- ANÁLISIS DEL RESULTADO PREVIEW -->
              @if (it.observaciones) {
                <div class="analysis-box">
                  <span class="analysis-lbl"> Análisis del Resultado:</span>
                  <p class="analysis-txt">{{ it.observaciones }}</p>
                </div>
              }

              <!-- BOTONES DE ACCIÓN: VER MÁS Y CAPTURAR -->
              <div class="card-footer-btns">
                <button type="button" class="btn-detail" (click)="openDetail(it)">
                   Ver más / Gráfica
                </button>
                <button type="button" class="btn-capturar" (click)="openCaptura(it.id)">
                   Capturar
                </button>
              </div>
            </article>
          }
        </div>
      }

      <!-- MODAL DE DETALLE PROFUNDO Y GRÁFICAS AMPLIADAS -->
      @if (detailItem(); as d) {
        <div class="modal-backdrop" (click)="closeDetail()">
          <div class="modal-card detail-modal" (click)="$event.stopPropagation()">
            <header class="detail-header">
              <div class="detail-title-wrap">
                <span class="code-badge big">{{ d.codigo }}</span>
                <div>
                  <h3>{{ d.nombre }}</h3>
                  <div class="detail-tags">
                    <span class="meta-tag"> Área: {{ formatAreaLabel(d.area) }}</span>
                    <span class="meta-tag"> Frecuencia: {{ d.frecuencia }}</span>
                    <span class="meta-tag">{{ d.sentido === 'ASCENDENTE' ? ' Creciente' : ' Decreciente' }}</span>
                  </div>
                </div>
              </div>
              <button type="button" class="btn-close" (click)="closeDetail()"></button>
            </header>

            <div class="detail-body">
              <!-- KPI PRINCIPAL DESTACADO -->
              <div class="detail-kpi-summary">
                <div class="kpi-box">
                  <span class="kpi-lbl">Meta Establecida</span>
                  <span class="kpi-val">{{ formatNum(d.meta) }}</span>
                </div>
                <div class="kpi-box">
                  <span class="kpi-lbl">Último Resultado Real</span>
                  <span class="kpi-val highlight">{{ formatNum(d.resultado) }}</span>
                </div>
                <div class="kpi-box">
                  <span class="kpi-lbl">Eficacia de Gestión</span>
                  <span class="kpi-val pct" [attr.data-c]="d.color || 'NA'">{{ calcPct(d) }}</span>
                </div>
                <div class="kpi-box">
                  <span class="kpi-lbl">Estado Semáforo</span>
                  <span class="dot big" [attr.data-c]="d.color || 'NA'">{{ d.color || 'SIN DATO' }}</span>
                </div>
              </div>

              <!-- GRAN GRÁFICA HISTÓRICA MES A MES -->
              <div class="detail-chart-card">
                <div class="chart-header">
                  <h4> Gráfica Detallada de Comportamiento & Tendencia (Año {{ anio }})</h4>
                  <small>Comparación de Barras: Meta Planificada vs. Resultado Real Obtenido</small>
                </div>

                @if (d.serie && d.serie.length > 0) {
                  <div class="big-chart-container">
                    <div class="big-bars-track">
                      @for (pt of d.serie; track pt.periodo) {
                        <div
                          class="big-bar-group"
                          [class.active-bar]="selectedPeriod() === pt.periodo"
                          (click)="selectPeriod(pt.periodo)"
                          style="cursor: pointer;"
                        >
                          <div class="bars-pair">
                            <!-- Barra Meta -->
                            <div
                              class="bar-pill bar-meta"
                              [style.height.px]="calcBigBarHeight(pt.meta, d.meta)"
                              [title]="'Meta: ' + formatNum(pt.meta)"
                            >
                              <span class="bar-val-tip">{{ formatNum(pt.meta) }}</span>
                            </div>
                            <!-- Barra Resultado -->
                            <div
                              class="bar-pill bar-res"
                              [attr.data-c]="pt.color"
                              [style.height.px]="calcBigBarHeight(pt.resultado, d.meta)"
                              [title]="'Resultado: ' + formatNum(pt.resultado)"
                            >
                              <span class="bar-val-tip">{{ formatNum(pt.resultado) }}</span>
                            </div>
                          </div>
                          <span class="big-period-lbl">Per. {{ pt.periodo }}</span>
                          <span class="dot mini" [attr.data-c]="pt.color">{{ pt.color }}</span>
                        </div>
                      }
                    </div>
                    <div class="chart-legend">
                      <span class="legend-item"><span class="legend-box meta"></span> Meta Planificada</span>
                      <span class="legend-item"><span class="legend-box verde"></span> Cumple Meta (Verde/Azul)</span>
                      <span class="legend-item"><span class="legend-box amarillo"></span> En Riesgo (Amarillo)</span>
                      <span class="legend-item"><span class="legend-box rojo"></span> Crítico / No Cumple (Rojo)</span>
                    </div>
                  </div>
                } @else {
                  <p class="no-chart-data">No se registran mediciones capturadas para este indicador en el año actual.</p>
                }
              </div>

              <!-- SECCIÓN INTERACTIVA DE ANÁLISIS DE RESULTADOS POR PERÍODO -->
              <div class="analysis-section-card">
                <div class="section-title-wrap">
                  <h4> Análisis Causa-Efecto y Observaciones por Período</h4>
                  <small>Haz clic en cualquier período para ver el análisis detallado y acciones tomadas</small>
                </div>

                @if (d.serie && d.serie.length > 0) {
                  <div class="period-pills-row">
                    @for (pt of d.serie; track pt.periodo) {
                      <button
                        type="button"
                        class="period-pill-btn"
                        [class.selected]="selectedPeriod() === pt.periodo"
                        (click)="selectPeriod(pt.periodo)"
                      >
                        <span class="period-title">Per. {{ pt.periodo }}</span>
                        <span class="dot mini" [attr.data-c]="pt.color">{{ pt.color }}</span>
                      </button>
                    }
                  </div>

                  @if (currentPeriodDetail(); as cur) {
                    <div class="period-detail-box" [attr.data-c]="cur.color">
                      <div class="period-detail-top">
                        <div class="period-info">
                          <strong>Período: {{ cur.periodo }} · Año {{ anio }}</strong>
                          <span class="meta-tag">Meta: <b>{{ formatNum(cur.meta) }}</b> | Res: <b>{{ formatNum(cur.resultado) }}</b></span>
                        </div>
                        <span class="dot" [attr.data-c]="cur.color">{{ cur.color }} ({{ cur.seguimiento || 'CERRADO' }})</span>
                      </div>
                      
                      <div class="obs-content">
                        <strong> Análisis de Causas y Observaciones Registradas:</strong>
                        <p class="obs-text">{{ cur.observaciones || 'No se registraron observaciones específicas para este período.' }}</p>
                      </div>
                    </div>
                  }
                }
              </div>

              <!-- TABLA COMPLETA HISTÓRICA CON OBSERVACIONES -->
              @if (d.serie && d.serie.length > 0) {
                <div class="hist-table-card">
                  <h4> Historial Completo y Trazabilidad del Indicador</h4>
                  <div class="table-scroll">
                    <table class="detail-hist-table">
                      <thead>
                        <tr>
                          <th>Período</th>
                          <th>Meta</th>
                          <th>Resultado</th>
                          <th>Cumplimiento</th>
                          <th>Estado</th>
                          <th>Análisis / Observaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (pt of d.serie; track pt.periodo) {
                          <tr [class.highlight-row]="selectedPeriod() === pt.periodo">
                            <td><strong>{{ pt.periodo }}</strong></td>
                            <td>{{ formatNum(pt.meta) }}</td>
                            <td><b>{{ formatNum(pt.resultado) }}</b></td>
                            <td><span class="pct-tag" [attr.data-c]="pt.color">{{ calcPctPoint(pt, d.sentido) }}</span></td>
                            <td><span class="dot mini" [attr.data-c]="pt.color">{{ pt.color }}</span></td>
                            <td class="obs-cell">{{ pt.observaciones || '—' }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              }

              <!-- FICHA TÉCNICA DEL INDICADOR -->
              @if (detailFicha(); as f) {
                <div class="ficha-card">
                  <h4> Ficha Técnica Oficial (Estándar ISO 9001 / BASC / SST)</h4>
                  <div class="ficha-grid">
                    <div class="ficha-field">
                      <strong> Propósito / Definición:</strong>
                      <p>{{ f.proposito || 'Medición del desempeño del proceso según estándares del Sistema Integrado de Gestión.' }}</p>
                    </div>
                    <div class="ficha-field">
                      <strong> Fórmula de Cálculo:</strong>
                      <code>{{ f.formula || 'Fórmula estándar de gestión de calidad' }}</code>
                    </div>
                    <div class="ficha-field">
                      <strong> Responsable del Proceso:</strong>
                      <p>{{ f.responsable || 'Líder del Proceso / Sistema Integrado de Gestión' }}</p>
                    </div>
                    <div class="ficha-field">
                      <strong> Subsistema Normativo:</strong>
                      <p><span class="sys-badge">{{ f.subsistema }}</span> (ISO 9001, ISO 45001, BASC, RSE, PESV)</p>
                    </div>
                  </div>
                </div>
              }

              <!-- ACCIONES DEL MODAL -->
              <div class="detail-actions">
                <button type="button" class="btn-primary" (click)="capturarFromDetail(d.id)">
                   Capturar / Actualizar Valor
                </button>
                <button type="button" class="btn-secondary" (click)="closeDetail()">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
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
              <option value="GH"> Gestión Humana</option>
              <option value="SISTEMAS"> Seguridad Electrónica & Sistemas</option>
              <option value="SST"> SST / Salud y Seguridad & PESV</option>
              <option value="OPERACIONES"> Operaciones y Puestos</option>
              <option value="COMERCIAL"> Comercial / Clientes</option>
              <option value="ADMIN"> Administrativo / Financiero</option>
              <option value="CALIDAD"> Calidad, BASC & Auditoría</option>
              <option value="DOTACION"> Dotación e Inventario</option>
              <option value="DOCUMENTAL"> Gestión Documental & Archivo</option>
              <option value="RECEPCION"> Recepción & Control de Acceso</option>
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
                  <td><span class="meta-tag">{{ formatAreaLabel(i.area) }}</span></td>
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
            <p>Ingresa la meta, resultado y análisis causa-efecto del período correspondiente.</p>
          </div>

          <div class="form-body">
            <label class="form-label">
              <span>Selecciona el Indicador</span>
              <select [(ngModel)]="capturaId" name="cid" (change)="onIndicador()">
                <option value="">-- Seleccionar Indicador --</option>
                @for (i of catalogo(); track i.id) {
                  <option [value]="i.id">{{ i.codigo }} — {{ i.nombre }} ({{ formatAreaLabel(i.area) }})</option>
                }
              </select>
            </label>

            @if (sel(); as s) {
              <div class="info-banner">
                <div><strong> Ficha Técnica:</strong> {{ s.proposito || 'Sin propósito registrado' }}</div>
                <div><strong> Fórmula:</strong> <code>{{ s.formula || 'Sin fórmula' }}</code></div>
                <div><strong> Área:</strong> {{ formatAreaLabel(s.area) }} | <strong>Frecuencia:</strong> {{ s.frecuencia }} | <strong>Sentido:</strong> {{ s.sentido }}</div>
              </div>

              <div class="grid-2col">
                <label class="form-label">
                  <span>Año</span>
                  <input type="number" [(ngModel)]="anio" name="ca" />
                </label>
                <label class="form-label">
                  <span>Período</span>
                  <input [(ngModel)]="periodo" name="cp" placeholder="Ej: 01, 02.. o T1, T2.." />
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
                <span>Análisis del Resultado / Observaciones & Plan de Acción</span>
                <textarea [(ngModel)]="obs" name="co" rows="4" placeholder="Ingresa análisis de causas, justificación del resultado y acciones tomadas..."></textarea>
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
                 Guardar Resultado y Análisis
              </button>

              <div class="hist-section">
                <h4>Historial de Capturas (Año {{ anio }})</h4>
                @for (r of hist(); track r.id) {
                  <div class="hist-row">
                    <div class="hist-main">
                      <span class="hist-period"> {{ r.anio }}-{{ r.periodo }}</span>
                      <span class="hist-vals">Meta: <b>{{ formatNum(r.metaSnapshot) }}</b> / Res: <b>{{ formatNum(r.valorResultado) }}</b></span>
                      <span class="dot mini" [attr.data-c]="r.colorSemaforo">{{ r.colorSemaforo }}</span>
                    </div>
                    @if (r.observaciones) {
                      <p class="hist-obs">{{ r.observaciones }}</p>
                    }
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
  styles: [
    `
    :host { display: block; }
    .page {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 1rem;
    }
    .title-wrap { display: flex; align-items: center; gap: 0.85rem; }
    .logo-badge {
      font-size: 1.8rem;
      background: #f0f9ff;
      border: 1px solid #bfdbfe;
      width: 52px;
      height: 52px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .head h2 { margin: 0; font-size: 1.4rem; color: #0c4a6e; font-weight: 800; }
    .head p { margin: 0.2rem 0 0; font-size: 0.85rem; color: #64748b; }
    
    .tabs { display: flex; gap: 0.4rem; }
    .tabs button {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 0.55rem 1rem;
      border-radius: 0.55rem;
      font-weight: 700;
      font-size: 0.85rem;
      color: #334155;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tabs button.on {
      background: #0c4a6e;
      color: #ffffff;
      border-color: #0c4a6e;
      box-shadow: 0 2px 4px rgba(30, 58, 138, 0.2);
    }

    .toast {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      padding: 0.75rem 1rem;
      border-radius: 0.6rem;
      font-weight: 600;
      font-size: 0.9rem;
      margin: 0;
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
      justify-content: space-between;
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
    .field select:focus, .field input:focus { border-color: #0369a1; background: #ffffff; }
    .search-field { flex: 1; min-width: 250px; }

    .global-kpi-pill {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 0.6rem 1.1rem;
      border-radius: 0.75rem;
    }
    .gauge-ring {
      background: #166534;
      color: #ffffff;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 0.82rem;
      box-shadow: 0 2px 4px rgba(22, 101, 52, 0.2);
    }
    .gauge-info { display: flex; flex-direction: column; }
    .gauge-info strong { color: #14532d; font-size: 0.88rem; }
    .gauge-info small { color: #15803d; font-size: 0.75rem; font-weight: 600; }

    .kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 0.85rem;
    }
    .kpi-card {
      background: #ffffff;
      border-radius: 0.85rem;
      padding: 0.85rem 1rem;
      display: flex;
      align-items: center;
      gap: 0.85rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .kpi-icon { font-size: 1.5rem; }
    .kpi-data { display: flex; flex-direction: column; flex: 1; }
    .kpi-data small { font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .kpi-data b { font-size: 1.35rem; color: #0f172a; line-height: 1.1; margin: 0.15rem 0; }
    .mini-prog { height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden; margin-top: 0.2rem; }
    .mini-bar { height: 100%; border-radius: 2px; }
    .bg-blue { background: #3b82f6; }
    .bg-green { background: #22c55e; }
    .bg-yellow { background: #eab308; }
    .bg-red { background: #ef4444; }
    .bg-gray { background: #94a3b8; }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
      gap: 1.15rem;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.95rem;
      padding: 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
    }
    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.06);
    }
    .card[data-c='AZUL'] { border-top: 4px solid #3b82f6; }
    .card[data-c='VERDE'] { border-top: 4px solid #22c55e; }
    .card[data-c='AMARILLO'] { border-top: 4px solid #eab308; }
    .card[data-c='ROJO'] { border-top: 4px solid #ef4444; }
    .card[data-c='NA'] { border-top: 4px solid #cbd5e1; }

    .card-top { display: flex; justify-content: space-between; align-items: center; }
    .code-badge {
      background: #f1f5f9;
      color: #334155;
      font-weight: 900;
      font-size: 0.85rem;
      padding: 0.2rem 0.6rem;
      border-radius: 0.4rem;
      border: 1px solid #cbd5e1;
      letter-spacing: 0.05em;
    }
    .dot {
      font-size: 0.68rem;
      font-weight: 800;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .dot[data-c='AZUL'] { background: #e0f2fe; color: #0369a1; }
    .dot[data-c='VERDE'] { background: #dcfce7; color: #166534; }
    .dot[data-c='AMARILLO'] { background: #fef9c3; color: #854d0e; }
    .dot[data-c='ROJO'] { background: #fee2e2; color: #991b1b; }
    .dot[data-c='NA'] { background: #f1f5f9; color: #64748b; }

    .card-title {
      margin: 0;
      font-size: 1rem;
      color: #0f172a;
      font-weight: 800;
      line-height: 1.3;
      min-height: 2.6rem;
    }

    .card-meta { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .meta-tag {
      font-size: 0.72rem;
      background: #f8fafc;
      color: #475569;
      border: 1px solid #e2e8f0;
      padding: 0.15rem 0.45rem;
      border-radius: 0.35rem;
      font-weight: 600;
    }

    .values-box {
      display: flex;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.65rem;
      padding: 0.55rem 0.75rem;
      justify-content: space-around;
    }
    .val-col { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .val-col .lbl { font-size: 0.68rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .val-col .val { font-size: 1rem; font-weight: 900; color: #0f172a; }
    .val-col .pct-val[data-c='AZUL'] { color: #0369a1; }
    .val-col .pct-val[data-c='VERDE'] { color: #16a34a; }
    .val-col .pct-val[data-c='AMARILLO'] { color: #ca8a04; }
    .val-col .pct-val[data-c='ROJO'] { color: #dc2626; }
    .val-divider { width: 1px; height: 28px; background: #cbd5e1; }

    .progress-container { margin-top: 0.15rem; }
    .progress-track { height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
    .progress-fill[data-c='AZUL'] { background: #3b82f6; }
    .progress-fill[data-c='VERDE'] { background: #22c55e; }
    .progress-fill[data-c='AMARILLO'] { background: #eab308; }
    .progress-fill[data-c='ROJO'] { background: #ef4444; }
    .progress-fill[data-c='NA'] { background: #94a3b8; }

    .sparkline-box {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      background: #f8fafc;
      padding: 0.45rem 0.65rem;
      border-radius: 0.55rem;
      border: 1px dashed #cbd5e1;
    }
    .sparkline-title { font-size: 0.68rem; font-weight: 700; color: #64748b; }
    .bars-row { display: flex; align-items: flex-end; gap: 0.35rem; height: 28px; }
    .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
    .bar-stem {
      flex: 1;
      width: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      background: rgba(226, 232, 240, 0.4);
      border-radius: 2px;
    }
    .bar-cap {
      width: 80%;
      min-height: 4px;
      border-radius: 2px 2px 0 0;
      transition: height 0.3s;
    }
    .bar-cap[data-c='AZUL'] { background: #3b82f6; }
    .bar-cap[data-c='VERDE'] { background: #22c55e; }
    .bar-cap[data-c='AMARILLO'] { background: #eab308; }
    .bar-cap[data-c='ROJO'] { background: #ef4444; }
    .bar-lbl { font-size: 0.65rem; color: #94a3b8; font-weight: 700; }

    /* CAJA PREVIEW ANÁLISIS EN LA CARD */
    .analysis-box {
      background: #f8fafc;
      border-left: 3px solid #3b82f6;
      padding: 0.5rem 0.65rem;
      border-radius: 0 0.45rem 0.45rem 0;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .analysis-lbl { font-size: 0.68rem; font-weight: 800; color: #0369a1; }
    .analysis-txt {
      margin: 0;
      font-size: 0.76rem;
      color: #334155;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-footer-btns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.45rem;
      margin-top: auto;
    }
    .btn-detail {
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #0c4a6e;
      border-radius: 0.55rem;
      padding: 0.55rem;
      font-weight: 700;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    .btn-detail:hover { background: #f0f9ff; border-color: #93c5fd; }
    
    .btn-capturar {
      border: 1px solid #bfdbfe;
      background: #f0f9ff;
      color: #0369a1;
      border-radius: 0.55rem;
      padding: 0.55rem;
      font-weight: 700;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    .btn-capturar:hover { background: #e0f2fe; border-color: #93c5fd; }

    /* MODAL DE DETALLE */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .detail-modal {
      background: #ffffff;
      width: 100%;
      max-width: 920px;
      max-height: 90vh;
      border-radius: 1.25rem;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
    }
    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 1.25rem 1.25rem 0 0;
    }
    .detail-title-wrap { display: flex; gap: 1rem; align-items: center; }
    .code-badge.big { font-size: 1.2rem; padding: 0.35rem 0.85rem; border-radius: 0.65rem; }
    .detail-header h3 { margin: 0; font-size: 1.25rem; color: #0f172a; font-weight: 800; }
    .detail-tags { display: flex; gap: 0.4rem; margin-top: 0.35rem; }
    .btn-close {
      border: none;
      background: #e2e8f0;
      color: #475569;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      font-size: 1rem;
      cursor: pointer;
      font-weight: bold;
    }
    .btn-close:hover { background: #cbd5e1; color: #0f172a; }

    .detail-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
    
    .detail-kpi-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 0.85rem;
    }
    .kpi-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 0.85rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .kpi-box .kpi-lbl { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .kpi-box .kpi-val { font-size: 1.35rem; font-weight: 900; color: #0f172a; }
    .kpi-box .kpi-val.highlight { color: #0c4a6e; }

    .detail-chart-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.95rem;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .chart-header h4 { margin: 0; font-size: 1.05rem; color: #0c4a6e; font-weight: 800; }
    .chart-header small { color: #64748b; font-size: 0.8rem; }

    .big-chart-container { display: flex; flex-direction: column; gap: 1rem; }
    .big-bars-track {
      display: flex;
      align-items: flex-end;
      gap: 1rem;
      height: 180px;
      padding: 1rem 0.5rem 0.5rem;
      background: #f8fafc;
      border-radius: 0.75rem;
      border: 1px solid #e2e8f0;
      overflow-x: auto;
    }
    .big-bar-group {
      flex: 1;
      min-width: 55px;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      justify-content: flex-end;
      gap: 0.4rem;
      border-radius: 0.5rem;
      padding: 0.2rem 0;
      transition: background 0.2s;
    }
    .big-bar-group:hover, .big-bar-group.active-bar {
      background: #f0f9ff;
    }
    .bars-pair {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      height: 120px;
      width: 100%;
      justify-content: center;
    }
    .bar-pill {
      width: 18px;
      min-height: 8px;
      border-radius: 4px 4px 0 0;
      position: relative;
      transition: height 0.3s ease;
    }
    .bar-pill.bar-meta { background: #94a3b8; }
    .bar-pill.bar-res[data-c='AZUL'] { background: #3b82f6; }
    .bar-pill.bar-res[data-c='VERDE'] { background: #22c55e; }
    .bar-pill.bar-res[data-c='AMARILLO'] { background: #eab308; }
    .bar-pill.bar-res[data-c='ROJO'] { background: #ef4444; }
    .bar-val-tip {
      position: absolute;
      top: -20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.65rem;
      font-weight: 800;
      color: #334155;
      white-space: nowrap;
    }
    .big-period-lbl { font-size: 0.75rem; font-weight: 800; color: #475569; }
    .dot.mini { font-size: 0.6rem; padding: 0.1rem 0.4rem; }

    .chart-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: center;
      padding-top: 0.5rem;
      border-top: 1px solid #f1f5f9;
      font-size: 0.78rem;
      font-weight: 700;
      color: #475569;
    }
    .legend-item { display: flex; align-items: center; gap: 0.35rem; }
    .legend-box { width: 12px; height: 12px; border-radius: 3px; }
    .legend-box.meta { background: #94a3b8; }
    .legend-box.verde { background: #22c55e; }
    .legend-box.amarillo { background: #eab308; }
    .legend-box.rojo { background: #ef4444; }
    .no-chart-data { text-align: center; color: #94a3b8; font-style: italic; padding: 2rem; }

    /* SECCIÓN DE ANÁLISIS DE RESULTADOS POR PERÍODO */
    .analysis-section-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.95rem;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .section-title-wrap h4 { margin: 0; font-size: 1.05rem; color: #0c4a6e; font-weight: 800; }
    .section-title-wrap small { color: #64748b; font-size: 0.8rem; }
    
    .period-pills-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .period-pill-btn {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 0.55rem;
      padding: 0.45rem 0.75rem;
      cursor: pointer;
      font-weight: 700;
      font-size: 0.8rem;
      color: #334155;
      transition: all 0.2s;
    }
    .period-pill-btn:hover { background: #f0f9ff; border-color: #93c5fd; }
    .period-pill-btn.selected {
      background: #0c4a6e;
      color: #ffffff;
      border-color: #0c4a6e;
      box-shadow: 0 2px 4px rgba(30, 58, 138, 0.25);
    }
    .period-pill-btn.selected .period-title { color: #ffffff; }

    .period-detail-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #3b82f6;
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .period-detail-box[data-c='VERDE'] { border-left-color: #22c55e; background: #f0fdf4; }
    .period-detail-box[data-c='AZUL'] { border-left-color: #3b82f6; background: #f0f9ff; }
    .period-detail-box[data-c='AMARILLO'] { border-left-color: #eab308; background: #fefce8; }
    .period-detail-box[data-c='ROJO'] { border-left-color: #ef4444; background: #fef2f2; }

    .period-detail-top { display: flex; justify-content: space-between; align-items: center; }
    .period-info { display: flex; align-items: center; gap: 0.75rem; font-size: 0.9rem; }
    .obs-content strong { display: block; font-size: 0.8rem; color: #475569; text-transform: uppercase; margin-bottom: 0.35rem; }
    .obs-text {
      margin: 0;
      font-size: 0.9rem;
      color: #1e293b;
      line-height: 1.5;
      white-space: pre-wrap;
      background: rgba(255, 255, 255, 0.8);
      padding: 0.75rem 1rem;
      border-radius: 0.55rem;
      border: 1px solid rgba(0,0,0,0.06);
    }

    /* TABLA HISTÓRICA DETALLADA */
    .hist-table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.95rem;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .hist-table-card h4 { margin: 0; font-size: 1rem; color: #0c4a6e; font-weight: 800; }
    .table-scroll { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 0.65rem; }
    .detail-hist-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .detail-hist-table th {
      background: #f8fafc;
      padding: 0.65rem 0.85rem;
      font-weight: 700;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
    }
    .detail-hist-table td {
      padding: 0.65rem 0.85rem;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
      vertical-align: top;
    }
    .detail-hist-table tr.highlight-row td { background: #f0f9ff; }
    .pct-tag {
      font-size: 0.75rem;
      font-weight: 800;
      padding: 0.15rem 0.45rem;
      border-radius: 0.35rem;
      background: #f1f5f9;
    }
    .pct-tag[data-c='AZUL'] { background: #e0f2fe; color: #0369a1; }
    .pct-tag[data-c='VERDE'] { background: #dcfce7; color: #166534; }
    .pct-tag[data-c='AMARILLO'] { background: #fef9c3; color: #854d0e; }
    .pct-tag[data-c='ROJO'] { background: #fee2e2; color: #991b1b; }
    .obs-cell { font-size: 0.82rem; color: #334155; line-height: 1.35; max-width: 320px; white-space: pre-wrap; }

    .ficha-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.95rem;
      padding: 1.25rem;
    }
    .ficha-card h4 { margin: 0 0 0.85rem; font-size: 1rem; color: #0f172a; font-weight: 800; }
    .ficha-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; }
    .ficha-field strong { display: block; font-size: 0.78rem; color: #475569; text-transform: uppercase; margin-bottom: 0.2rem; }
    .ficha-field p { margin: 0; font-size: 0.88rem; color: #1e293b; line-height: 1.4; }
    .ficha-field code { background: #e2e8f0; padding: 0.2rem 0.5rem; border-radius: 0.35rem; font-size: 0.82rem; font-weight: 700; color: #0f172a; }

    .detail-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid #e2e8f0;
    }
    .btn-primary {
      background: #0c4a6e;
      color: #ffffff;
      border: none;
      border-radius: 0.55rem;
      padding: 0.65rem 1.25rem;
      font-weight: 800;
      font-size: 0.9rem;
      cursor: pointer;
    }
    .btn-primary:hover { background: #075985; }
    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      border-radius: 0.55rem;
      padding: 0.65rem 1.25rem;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
    }
    .btn-secondary:hover { background: #e2e8f0; color: #0f172a; }

    .btn-sync-col { display: flex; align-items: flex-end; }
    .btn-sync-sig {
      background: #047857;
      color: #ffffff;
      border: 1px solid #065f46;
      border-radius: 0.65rem;
      padding: 0.55rem 1rem;
      font-size: 0.85rem;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .btn-sync-sig:hover:not(:disabled) {
      background: #065f46;
      box-shadow: 0 4px 10px rgba(4, 120, 87, 0.25);
    }
    .btn-sync-sig:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* TABLA CATÁLOGO */
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
      background: #f0f9ff;
      color: #0369a1;
      border-radius: 0.4rem;
      padding: 0.35rem 0.65rem;
      font-weight: 700;
      font-size: 0.78rem;
      cursor: pointer;
      margin-left: 0.35rem;
    }
    .btn-action.outline { background: transparent; border: 1px solid #cbd5e1; color: #475569; }

    /* MAPA ESTRATÉGICO */
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
      color: #0c4a6e;
      font-weight: 800;
      border-bottom: 2px solid #f0f9ff;
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
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .obj-btn:hover { background: #f0f9ff; border-color: #93c5fd; transform: translateX(2px); }
    .obj-btn strong { font-size: 0.85rem; color: #1e293b; line-height: 1.3; }
    .obj-footer { display: flex; justify-content: space-between; align-items: center; }
    .sys-badge {
      background: #e0e7ff;
      color: #3730a3;
      font-size: 0.68rem;
      font-weight: 800;
      padding: 0.1rem 0.45rem;
      border-radius: 0.35rem;
    }
    .count-badge { font-size: 0.72rem; color: #64748b; font-weight: 600; }

    /* FORMULARIO DE CAPTURA */
    .form-container {
      background: #ffffff;
      border-radius: 0.95rem;
      border: 1px solid #e2e8f0;
      max-width: 720px;
      margin: 0 auto;
      overflow: hidden;
    }
    .form-header {
      background: #f8fafc;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .form-header h3 { margin: 0; font-size: 1.15rem; color: #0c4a6e; font-weight: 800; }
    .form-header p { margin: 0.25rem 0 0; color: #64748b; font-size: 0.85rem; }
    .form-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .form-label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem; font-weight: 700; color: #334155; }
    .form-label select, .form-label input, .form-label textarea {
      font: inherit;
      border: 1px solid #cbd5e1;
      border-radius: 0.55rem;
      padding: 0.6rem 0.85rem;
      color: #0f172a;
      background: #f8fafc;
      outline: none;
    }
    .form-label select:focus, .form-label input:focus, .form-label textarea:focus {
      border-color: #0369a1;
      background: #ffffff;
    }
    .grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .info-banner {
      background: #f0f9ff;
      border: 1px solid #bfdbfe;
      border-radius: 0.65rem;
      padding: 0.75rem 1rem;
      font-size: 0.85rem;
      color: #0369a1;
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
      background: #0c4a6e;
      color: #ffffff;
      border-radius: 0.65rem;
      padding: 0.85rem 1.25rem;
      font-weight: 800;
      font-size: 0.95rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-save:hover { background: #075985; }
    .btn-save:disabled { background: #94a3b8; cursor: not-allowed; }

    .hist-section {
      margin-top: 1rem;
      border-top: 1px solid #e2e8f0;
      padding-top: 1rem;
    }
    .hist-section h4 { margin: 0 0 0.75rem; font-size: 0.95rem; color: #1e293b; }
    .hist-row {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      padding: 0.75rem 0.5rem;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.85rem;
    }
    .hist-main { display: flex; justify-content: space-between; align-items: center; }
    .hist-period { font-weight: 700; color: #334155; }
    .hist-vals { color: #64748b; }
    .hist-vals b { color: #0f172a; }
    .hist-obs {
      margin: 0;
      font-size: 0.8rem;
      color: #475569;
      background: #f8fafc;
      padding: 0.4rem 0.6rem;
      border-radius: 0.35rem;
      border-left: 2px solid #94a3b8;
    }
    .muted { color: #94a3b8; font-size: 0.85rem; font-style: italic; }
  `,
  ],
})
export class SigHome implements OnInit {
  private readonly api = inject(SigApiService);
  readonly tabs: Array<{ id: Tab; label: string }> = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'mapa', label: 'Mapa Estratégico' },
    { id: 'catalogo', label: 'Catálogo CMI' },
    { id: 'captura', label: 'Captura / Registro' },
  ];
  readonly perspectivas = ['FINANZAS', 'CLIENTES', 'PROCESOS', 'APRENDIZAJE'];
  readonly tab = signal<Tab>('dashboard');
  readonly dash = signal<SigDashboard | null>(null);
  readonly objetivos = signal<SigObjetivo[]>([]);
  readonly catalogo = signal<SigIndicador[]>([]);
  readonly hist = signal<SigResultado[]>([]);
  readonly sel = signal<SigIndicador | null>(null);
  readonly busy = signal(false);
  readonly syncingSig = signal(false);
  readonly msg = signal('');
  readonly color = signal('');

  autoCalcularSig(): void {
    if (this.syncingSig()) return;
    this.syncingSig.set(true);
    this.msg.set('Sincronizando y auto-calculando indicadores desde operaciones...');
    this.api.autoCalcular(this.anio).subscribe({
      next: (res) => {
        this.syncingSig.set(false);
        this.msg.set(` ${res.message || 'Indicadores actualizados con éxito'}`);
        this.loadDash();
        setTimeout(() => this.msg.set(''), 5000);
      },
      error: () => {
        this.syncingSig.set(false);
        this.msg.set(' Error al sincronizar indicadores automáticos');
        setTimeout(() => this.msg.set(''), 4000);
      },
    });
  }

  // Detalle expandido
  readonly detailItem = signal<DashboardItem | null>(null);
  readonly detailFicha = signal<SigIndicador | null>(null);
  readonly selectedPeriod = signal<string>('');

  area = '';
  filtroArea = '';
  anio = 2024; // Año con información completa del Excel
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

  openDetail(it: DashboardItem): void {
    this.detailItem.set(it);
    // Seleccionar por defecto el último período
    if (it.serie && it.serie.length > 0) {
      this.selectedPeriod.set(it.serie[it.serie.length - 1].periodo);
    } else {
      this.selectedPeriod.set(it.periodo || '');
    }
    const ficha = this.catalogo().find((c) => c.id === it.id || c.codigo === it.codigo);
    this.detailFicha.set(ficha || null);
  }

  closeDetail(): void {
    this.detailItem.set(null);
    this.detailFicha.set(null);
    this.selectedPeriod.set('');
  }

  selectPeriod(p: string): void {
    this.selectedPeriod.set(p);
  }

  currentPeriodDetail(): SeriePoint | null {
    const item = this.detailItem();
    if (!item || !item.serie) return null;
    const p = this.selectedPeriod();
    const found = item.serie.find((s) => s.periodo === p);
    return found || item.serie[item.serie.length - 1] || null;
  }

  capturarFromDetail(id: string): void {
    this.closeDetail();
    this.openCaptura(id);
  }

  formatAreaLabel(a: string): string {
    const map: Record<string, string> = {
      GH: 'Gestión Humana',
      SISTEMAS: 'Seguridad Electrónica & Sistemas',
      SST: 'SST & Seguridad Vial',
      OPERACIONES: 'Operaciones y Puestos',
      COMERCIAL: 'Comercial / Clientes',
      ADMIN: 'Administrativo & Financiero',
      CALIDAD: 'Calidad, BASC & Auditoría',
      DOTACION: 'Dotación e Inventario',
      DOCUMENTAL: 'Gestión Documental & Archivo',
      RECEPCION: 'Recepción & Control Acceso',
    };
    return map[a] || a;
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

  calcPct(it: DashboardItem): string {
    if (it.meta === null || it.resultado === null || it.meta === 0) return '100%';
    const pct =
      it.sentido === 'ASCENDENTE'
        ? (it.resultado / it.meta) * 100
        : (it.meta / it.resultado) * 100;
    return `${Math.round(pct)}%`;
  }

  calcPctPoint(pt: SeriePoint, sentido: string): string {
    if (pt.meta === null || pt.resultado === null || pt.meta === 0) return '100%';
    const pct =
      sentido === 'ASCENDENTE'
        ? (pt.resultado / pt.meta) * 100
        : (pt.meta / pt.resultado) * 100;
    return `${Math.round(pct)}%`;
  }

  calcBarWidth(it: DashboardItem): number {
    if (it.meta === null || it.resultado === null) return 0;
    if (it.meta === 0) return 100;
    const pct =
      it.sentido === 'ASCENDENTE'
        ? (it.resultado / it.meta) * 100
        : (it.meta / it.resultado) * 100;
    return Math.min(100, Math.max(5, Math.round(pct)));
  }

  calcBarHeight(res: number, meta: number | null): number {
    if (!meta || meta === 0) return 18;
    const ratio = Math.min(1.5, Math.max(0.2, res / meta));
    return Math.round(ratio * 16);
  }

  calcBigBarHeight(val: number, metaRef: number | null): number {
    if (!metaRef || metaRef === 0) return 40;
    const ratio = Math.min(2.0, Math.max(0.15, val / metaRef));
    return Math.round(ratio * 70);
  }

  totalEvaluados(): number {
    const c = this.dash()?.counts;
    if (!c) return 0;
    return (c.AZUL || 0) + (c.VERDE || 0) + (c.AMARILLO || 0) + (c.ROJO || 0);
  }

  totalCumplen(): number {
    const c = this.dash()?.counts;
    if (!c) return 0;
    return (c.AZUL || 0) + (c.VERDE || 0);
  }

  globalEficacia(): number {
    const total = this.totalEvaluados();
    if (total === 0) return 0;
    return Math.round((this.totalCumplen() / total) * 100);
  }

  pctCount(key: keyof NonNullable<SigDashboard['counts']>): number {
    const total = this.totalEvaluados();
    if (total === 0) return 0;
    return Math.round(((this.dash()?.counts[key] || 0) / total) * 100);
  }

  loadDash(): void {
    this.api.dashboard(this.area || undefined, Number(this.anio)).subscribe({
      next: (d) => this.dash.set(d),
      error: () => this.showToast('Error cargando el tablero de indicadores'),
    });
  }

  loadCatalogo(): void {
    const query: Record<string, string> = this.filtroArea ? { area: this.filtroArea } : {};
    this.api.indicadores(query).subscribe({
      next: (arr) => this.catalogo.set(arr),
    });
  }

  catalogoFiltrado(): SigIndicador[] {
    const term = this.q.trim().toLowerCase();
    if (!term) return this.catalogo();
    return this.catalogo().filter(
      (i) =>
        i.codigo.toLowerCase().includes(term) ||
        i.nombre.toLowerCase().includes(term) ||
        i.area.toLowerCase().includes(term)
    );
  }

  objetivosBy(perspectiva: string): SigObjetivo[] {
    return this.objetivos().filter((o) => o.perspectiva === perspectiva);
  }

  fromMapa(objId: string): void {
    this.tab.set('catalogo');
    this.api.indicadores().subscribe({
      next: (arr) => {
        this.catalogo.set(arr.filter((i) => i.objetivoId === objId));
      },
    });
  }

  openCaptura(id: string): void {
    this.tab.set('captura');
    this.capturaId = id;
    this.onIndicador();
  }

  onIndicador(): void {
    const found = this.catalogo().find((i) => i.id === this.capturaId);
    this.sel.set(found || null);
    if (found) {
      this.api.resultados(found.id, Number(this.anio)).subscribe({
        next: (h: SigResultado[]) => {
          this.hist.set(h);
          if (h.length > 0) {
            const last = h[h.length - 1];
            this.meta = Number(last.metaSnapshot);
            this.resultado = Number(last.valorResultado);
            this.obs = last.observaciones || '';
            this.color.set(last.colorSemaforo);
          } else {
            this.meta = 0;
            this.resultado = 0;
            this.obs = '';
            this.color.set('');
          }
        },
      });
    }
  }

  guardar(): void {
    if (!this.capturaId) {
      this.showToast('Selecciona un indicador primero');
      return;
    }
    this.busy.set(true);
    this.api
      .capturar({
        indicadorId: this.capturaId,
        anio: Number(this.anio),
        periodo: this.periodo.trim(),
        meta: Number(this.meta),
        resultado: Number(this.resultado),
        observaciones: this.obs.trim() || undefined,
        seguimiento: this.seguimiento,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.showToast(' Resultado y análisis registrados exitosamente');
          this.onIndicador();
        },
        error: () => {
          this.busy.set(false);
          this.showToast(' Error al registrar resultado');
        },
      });
  }

  toggleActivo(ind: SigIndicador): void {
    this.api.patchIndicador(ind.id, { activo: !ind.activo }).subscribe({
      next: (upd: SigIndicador) => {
        this.catalogo.update((list) =>
          list.map((item) => (item.id === upd.id ? upd : item))
        );
        this.showToast(
          `Indicador ${upd.codigo} ${upd.activo ? 'activado' : 'inactivado'}`
        );
      },
    });
  }

  private showToast(m: string): void {
    this.msg.set(m);
    setTimeout(() => this.msg.set(''), 4000);
  }
}
