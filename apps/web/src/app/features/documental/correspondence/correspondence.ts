import { SlicePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideClock,
  LucideFileText,
  LucideInbox,
  LucideInfo,
  LucidePackage,
  LucidePlus,
  LucideSend,
  LucideX,
} from '@lucide/angular';
import { AuthService } from '../../../core/services/auth.service';
import { Icon } from '../../../shared/components/icon/icon';
import { Correspondence, DocumentalApiService } from '../documental-api.service';
import { DOC_STYLES } from '../documental.styles';

export interface DepartmentOption {
  code: string;
  name: string;
  trdPrefix: string;
}

export interface TrdOption {
  val: string;
  label: string;
}

export const DEPARTAMENTOS_CORAZA: DepartmentOption[] = [
  { code: 'GE', name: '👔 GE — Gerencia General', trdPrefix: '100' },
  { code: 'GH', name: '👥 GH — Gestión Humana / RRHH', trdPrefix: '200' },
  { code: 'AF', name: '💼 AF — Administrativo y Financiero', trdPrefix: '300' },
  { code: 'CP', name: '📦 CP — Compras y Suministros', trdPrefix: '310' },
  { code: 'CM', name: '🤝 CM — Comercial y Mercadeo', trdPrefix: '320' },
  { code: 'OP', name: '🛡️ OP — Operaciones / Vigilancia', trdPrefix: '400' },
  { code: 'SE', name: '📹 SE — Seguridad Electrónica', trdPrefix: '410' },
  { code: 'SP', name: '🏍️ SP — Supervisión y Control', trdPrefix: '420' },
  { code: 'DJ', name: '⚖️ DJ — Jurídico y Legal', trdPrefix: '500' },
  { code: 'CE', name: '🏢 CE — Cliente Externo', trdPrefix: '900' },
  { code: 'AS', name: '👥 AS — Asociados CTA', trdPrefix: '910' },
];

export const MAPA_TRD_COMPLETO: Record<string, TrdOption[]> = {
  GE: [
    { val: '100-10.01', label: '100-10.01 — GERENCIA / Cartas, Comunicaciones Oficiales y Memorandos (10 Años C.Co)' },
    { val: '100-10.02', label: '100-10.02 — GERENCIA / Actas de Consejo de Administración y Asambleas (Conservación Total)' },
    { val: '100-10.03', label: '100-10.03 — GERENCIA / Resoluciones, Directivas y Políticas Institucionales (Conservación Total)' },
    { val: '100-10.04', label: '100-10.04 — GERENCIA / Informes de Gestión, Sostenibilidad y Rendición de Cuentas (5 Años)' },
    { val: '100-10.05', label: '100-10.05 — GERENCIA / Convenios de Intermediación y Alianzas Estratégicas (10 Años)' },
    { val: '100-10.06', label: '100-10.06 — GERENCIA / Planes Estratégicos y Proyectos de Inversión (10 Años)' },
    { val: '100-10.07', label: '100-10.07 — GERENCIA / Actas del Comité Directivo y Comités Ejecutivos (10 Años)' },
    { val: '100-10.08', label: '100-10.08 — GERENCIA / Reformas Estatutarias y Reglamento Interno CTA (Conservación Total)' },
    { val: '100-10.09', label: '100-10.09 — GERENCIA / Auditorías de Calidad ISO y Certificaciones (5 Años)' },
    { val: '100-10.10', label: '100-10.10 — GERENCIA / Poderes y Mandatos de Representación Legal (10 Años)' },
  ],
  GH: [
    { val: '200-20.01', label: '200-20.01 — GESTION HUMANA / Historias Laborales y Expedientes Asociados (20 Años Ley 594)' },
    { val: '200-20.02', label: '200-20.02 — GESTION HUMANA / Cartas, Memorandos y Comunicaciones Internas (5 Años)' },
    { val: '200-20.03', label: '200-20.03 — GESTION HUMANA / Nóminas de Pago y Planillas PILA/Aportes (20 Años Ley 100)' },
    { val: '200-20.04', label: '200-20.04 — GESTION HUMANA / Procesos Disciplinarios y Descargos (10 Años)' },
    { val: '200-20.05', label: '200-20.05 — GESTION HUMANA / Certificaciones Laborales y Paz y Salvos (10 Años)' },
    { val: '200-20.06', label: '200-20.06 — GESTION HUMANA / Hojas de Vida de Aspirantes e Inactivos (3 Años)' },
    { val: '200-20.07', label: '200-20.07 — GESTION HUMANA / Capacitaciones, Inducciones y Formación (5 Años)' },
    { val: '200-20.08', label: '200-20.08 — GESTION HUMANA / Evaluaciones del Desempeño y Clima Laboral (5 Años)' },
  ],
  AF: [
    { val: '300-30.01', label: '300-30.01 — FINANCIERA / Estados Financieros, Balances y Dictámenes (20 Años C.Co)' },
    { val: '300-30.02', label: '300-30.02 — FINANCIERA / Comprobantes de Egreso, Ingreso y Recibos de Caja (10 Años DIAN)' },
    { val: '300-30.03', label: '300-30.03 — FINANCIERA / Facturación Electrónica de Venta y Notas Crédito (10 Años)' },
    { val: '300-30.04', label: '300-30.04 — FINANCIERA / Declaraciones Tributarias (Renta, IVA, Retención, ICA) (10 Años)' },
    { val: '300-30.05', label: '300-30.05 — FINANCIERA / Conciliaciones Bancarias y Extractos de Cuenta (10 Años)' },
    { val: '300-30.06', label: '300-30.06 — FINANCIERA / Libros Oficiales de Contabilidad Registrados (Conservación Total)' },
    { val: '300-30.07', label: '300-30.07 — FINANCIERA / Cartera, Cobro Coactivo y Cuentas por Cobrar (10 Años)' },
    { val: '300-30.08', label: '300-30.08 — FINANCIERA / Presupuestos y Ejecución Presupuestal Anual (5 Años)' },
  ],
  CP: [
    { val: '310-31.01', label: '310-31.01 — COMPRAS / Órdenes de Compra y Solicitudes de Suministro (5 Años)' },
    { val: '310-31.02', label: '310-31.02 — COMPRAS / Selección y Evaluación de Proveedores (5 Años)' },
    { val: '310-31.03', label: '310-31.03 — COMPRAS / Facturas, Cotizaciones y Remisiones de Proveedores (10 Años)' },
    { val: '310-31.04', label: '310-31.04 — COMPRAS / Inventarios de Armamento, Vehículos y Equipos (10 Años SuperVigilancia)' },
    { val: '310-31.05', label: '310-31.05 — COMPRAS / Hojas de Vida y Mantenimiento de Vehículos (5 Años)' },
    { val: '310-31.06', label: '310-31.06 — COMPRAS / Registro y Entrega de Dotación Operativa y Uniformes (5 Años)' },
    { val: '310-31.07', label: '310-31.07 — COMPRAS / Contratos de Compraventa y Adquisición de Bienes (10 Años)' },
  ],
  CM: [
    { val: '320-32.01', label: '320-32.01 — COMERCIAL / Ofertas Comerciales, Propuestas y Cotizaciones (5 Años)' },
    { val: '320-32.02', label: '320-32.02 — COMERCIAL / Licitaciones Públicas y Concursos de Méritos (10 Años)' },
    { val: '320-32.03', label: '320-32.03 — COMERCIAL / Cartas y Comunicaciones Oficiales con Clientes (5 Años)' },
    { val: '320-32.04', label: '320-32.04 — COMERCIAL / Encuestas de Satisfacción, PQRS y PQRSFD (3 Años)' },
    { val: '320-32.05', label: '320-32.05 — COMERCIAL / Estudios de Mercado y Análisis de Competencia (3 Años)' },
    { val: '320-32.06', label: '320-32.06 — COMERCIAL / Portafolios de Servicios y Presentaciones Corporativas (3 Años)' },
  ],
  OP: [
    { val: '400-40.01', label: '400-40.01 — OPERACIONES / Minutas de Servicio y Libros de Puestos (5 Años SuperVigilancia)' },
    { val: '400-40.02', label: '400-40.02 — OPERACIONES / Reportes de Novedades, Incidentes y Siniestros (5 Años)' },
    { val: '400-40.03', label: '400-40.03 — OPERACIONES / Programación de Turnos, Malla Operativa y Cuadrantes (3 Años)' },
    { val: '400-40.04', label: '400-40.04 — OPERACIONES / Control de Armamento, Salvoconductos y Municiómetro (10 Años Indumil)' },
    { val: '400-40.05', label: '400-40.05 — OPERACIONES / Informes de Estudio de Seguridad e Inspección (5 Años)' },
    { val: '400-40.06', label: '400-40.06 — OPERACIONES / Control de Radiocomunicaciones y Frecuencias (5 Años Mintic)' },
    { val: '400-40.07', label: '400-40.07 — OPERACIONES / Planes de Contingencia Operativa y Red de Apoyo (5 Años)' },
    { val: '400-40.08', label: '400-40.08 — OPERACIONES / Consignas Particulares y Generales de Puestos (5 Años)' },
  ],
  SE: [
    { val: '410-41.01', label: '410-41.01 — SEGURIDAD ELECTRONICA / Informes Técnicos Mantenimiento CCTV y Alarmas (5 Años)' },
    { val: '410-41.02', label: '410-41.02 — SEGURIDAD ELECTRONICA / Bitácoras de Monitoreo y Control de Video (3 Años)' },
    { val: '410-41.03', label: '410-41.03 — SEGURIDAD ELECTRONICA / Diseños y Planos de Sistemas de Control de Acceso (10 Años)' },
    { val: '410-41.04', label: '410-41.04 — SEGURIDAD ELECTRONICA / Reportes de Fallas Técnicas y Tiempos SLA (3 Años)' },
  ],
  SP: [
    { val: '420-42.01', label: '420-42.01 — SUPERVISION / Informes de Ronda, Supervisión y Verificación de Puestos (3 Años)' },
    { val: '420-42.02', label: '420-42.02 — SUPERVISION / Planillas de Control de Patrullas y Kilometraje (3 Años)' },
    { val: '420-42.03', label: '420-42.03 — SUPERVISION / Pruebas de Alcoholemia y Control Operativo (5 Años)' },
    { val: '420-42.04', label: '420-42.04 — SUPERVISION / Inspección de Uniformes, Equipos y Armamento (3 Años)' },
  ],
  DJ: [
    { val: '500-50.01', label: '500-50.01 — JURIDICO / Contratos de Servicios de Vigilancia Privada (20 Años C.Co)' },
    { val: '500-50.02', label: '500-50.02 — JURIDICO / Convenios Interinstitucionales y Consorcios (10 Años)' },
    { val: '500-50.03', label: '500-50.03 — JURIDICO / Procesos Judiciales, Tutelas, Demandas y Contestaciones (20 Años)' },
    { val: '500-50.04', label: '500-50.04 — JURIDICO / Pólizas de Seguro, Responsabilidad Civil y Garantías (10 Años)' },
    { val: '500-50.05', label: '500-50.05 — JURIDICO / Licencias de Funcionamiento SuperVigilancia (Conservación Total)' },
    { val: '500-50.06', label: '500-50.06 — JURIDICO / Derechos de Petición y Requerimientos de Entidades (10 Años)' },
  ],
  CE: [
    { val: '900-90.01', label: '900-90.01 — CLIENTE EXTERNO / Correspondencia Recibida de Clientes y Contratantes (5 Años)' },
    { val: '900-90.02', label: '900-90.02 — CLIENTE EXTERNO / Solicitudes de Servicio e Informes Especiales (5 Años)' },
    { val: '900-90.03', label: '900-90.03 — CLIENTE EXTERNO / Actas de Entrega, Recepción y Empalme de Puestos (10 Años)' },
  ],
  AS: [
    { val: '910-91.01', label: '910-91.01 — ASOCIADOS / Comunicaciones y Solicitudes de Asociados CTA (10 Años)' },
    { val: '910-91.02', label: '910-91.02 — ASOCIADOS / Convenios de Trabajo Asociado y Reglamentos Cooperativos (20 Años)' },
    { val: '910-91.03', label: '910-91.03 — ASOCIADOS / Solicitudes de Retiro y Compensaciones CTA (20 Años)' },
    { val: '910-91.04', label: '910-91.04 — ASOCIADOS / Certificados de Compensación Ordinaria y Aportes (20 Años)' },
  ],
};

@Component({
  selector: 'app-doc-correspondence',
  imports: [FormsModule, SlicePipe, Icon],
  template: `
    <div class="corr-container">
      <div class="toolbar">
        <div>
          <h3>Correspondencia y Radicación TRD</h3>
          <p class="muted">Gestión oficial de correspondencia interna y externa bajo norma AGN.</p>
        </div>
        @if (canCreate()) {
          <button class="btn-primary" (click)="toggle()">
            <app-icon [icon]="showForm() ? icons.X : icons.Plus" [size]="16" [strokeWidth]="2" />
            <span>{{ showForm() ? 'Cerrar' : 'Radicar Documento' }}</span>
          </button>
        }
      </div>

      <!-- FORMULARIO DE RADICACIÓN CON BARRAS DESPLEGABLES PRECONFIGURADAS -->
      @if (showForm()) {
        <form class="card form-corr" (ngSubmit)="save()">
          <div class="form-header-badge">
            <app-icon [icon]="icons.FileText" [size]="18" [strokeWidth]="2" />
            <strong>Radicación Oficial de Correspondencia (Norma AGN)</strong>
          </div>

          <div class="form-grid">
            <!-- 1. DEPENDENCIA ORIGEN -->
            <label class="form-group">
              <span class="label-title">Dependencia Origen (Sigla) *</span>
              <select
                [(ngModel)]="model.originDept"
                name="originDept"
                required
                (ngModelChange)="onOriginDeptChange($event)"
                class="inp-select"
              >
                @for (d of departamentos; track d.code) {
                  <option [value]="d.code">{{ d.name }}</option>
                }
              </select>
            </label>

            <!-- 2. DEPENDENCIA DESTINO -->
            <label class="form-group">
              <span class="label-title">Dependencia Destino *</span>
              <select [(ngModel)]="model.destinationDept" name="destinationDept" required class="inp-select">
                @for (d of departamentos; track d.code) {
                  <option [value]="d.code">{{ d.name }}</option>
                }
              </select>
            </label>

            <!-- 3. SERIE TRD (DESPLEGABLE DINÁMICO) -->
            <label class="form-group span-2">
              <span class="label-title">Serie / Subserie TRD (Norma AGN) *</span>
              <select
                [(ngModel)]="selectedSerieVal"
                name="selectedSerieVal"
                required
                (ngModelChange)="onSerieChange($event)"
                class="inp-select highlight"
              >
                @for (s of seriesDisponibles(); track s.val) {
                  <option [value]="s.val">{{ s.label }}</option>
                }
              </select>
            </label>

            <!-- 4. RADICADO GENERADO EN VIVO -->
            <label class="form-group">
              <span class="label-title">Código Oficial (Radicado TRD)</span>
              <input
                type="text"
                [value]="previewCode()"
                readonly
                class="inp-radicado"
                placeholder="Calculando radicado..."
              />
            </label>

            <!-- 5. FECHA DOCUMENTO -->
            <label class="form-group">
              <span class="label-title">Fecha del Documento *</span>
              <input type="date" [(ngModel)]="model.documentDate" name="documentDate" required class="inp-text" />
            </label>

            <!-- 6. MEDIO DE RECEPCIÓN / ENVÍO -->
            <label class="form-group">
              <span class="label-title">Medio de Recepción / Envío *</span>
              <select [(ngModel)]="model.medium" name="medium" required class="inp-select">
                <option value="FISICO">📦 Físico (Papel / Ventanilla)</option>
                <option value="DIGITAL">💻 Digital (Portal / Archivo)</option>
                <option value="EMAIL">📧 Correo Electrónico</option>
                <option value="MENSAJERIA">🛵 Mensajería Especializada</option>
              </select>
            </label>

            <!-- 7. TIPO DE DOCUMENTO -->
            <label class="form-group">
              <span class="label-title">Tipo de Documento *</span>
              <select [(ngModel)]="model.documentType" name="documentType" required class="inp-select">
                <option value="OFICIO">📄 Oficio</option>
                <option value="MEMORANDO">📝 Memorando</option>
                <option value="CIRCULAR">📢 Circular</option>
                <option value="CARTA">✉️ Carta</option>
                <option value="ACTA">📋 Acta de Reunión</option>
                <option value="SOLICITUD">📑 Solicitud / Petición</option>
                <option value="INFORME">📊 Informe de Gestión</option>
                <option value="CERTIFICADO">📜 Certificado / Paz y Salvo</option>
                <option value="DERECHO_PETICION">⚖️ Derecho de Petición</option>
                <option value="OTRO">📁 Otro Documento</option>
              </select>
            </label>

            <!-- 8. ESTADO INICIAL -->
            <label class="form-group">
              <span class="label-title">Estado de Gestión *</span>
              <select [(ngModel)]="model.status" name="status" required class="inp-select">
                <option value="PENDIENTE">⏳ PENDIENTE — En espera de proceso</option>
                <option value="ENVIADO">📤 ENVIADO — Despachado al destino</option>
                <option value="RECIBIDO">📥 RECIBIDO — Confirmado en destino</option>
                <option value="ENTREGADO">✅ ENTREGADO — Firmado y recibido</option>
                <option value="DEVUELTO">🔄 DEVUELTO — Regresado al origen</option>
              </select>
            </label>

            <!-- 9. UBICACIÓN FÍSICA EN ARCHIVO (VOXELSERA) -->
            <label class="form-group">
              <span class="label-title">Ubicación Física en Archivo (Voxelsera) *</span>
              <select [(ngModel)]="model.voxelsera" name="voxelsera" required class="inp-select">
                <option value="">-- Seleccionar Casilla en Estante D * --</option>
                <option value="VOXEL_D1">📁 Estante D — Casilla D1 (Correspondencia)</option>
                <option value="VOXEL_D2">📁 Estante D — Casilla D2 (Correspondencia)</option>
                <option value="VOXEL_D3">📁 Estante D — Casilla D3 (Correspondencia)</option>
                <option value="VOXEL_D4">📁 Estante D — Casilla D4 (Correspondencia)</option>
                <option value="VOXEL_D5">📁 Estante D — Casilla D5 (Correspondencia)</option>
                <option value="VOXEL_D6">📁 Estante D — Casilla D6 (Correspondencia)</option>
                <option value="VOXEL_D7">📁 Estante D — Casilla D7 (Correspondencia)</option>
                <option value="VOXEL_D8">📁 Estante D — Casilla D8 (Correspondencia)</option>
                <option value="VOXEL_D9">📁 Estante D — Casilla D9 (Correspondencia)</option>
              </select>
            </label>

            <!-- 10. ASUNTO -->
            <label class="form-group span-2">
              <span class="label-title">Asunto del Documento *</span>
              <input
                type="text"
                [(ngModel)]="model.subject"
                name="subject"
                required
                placeholder="Breve resumen o motivo de la correspondencia"
                class="inp-text"
              />
            </label>

            <!-- 11. DETALLE -->
            <label class="form-group span-2">
              <span class="label-title">Detalle / Observaciones Adicionales</span>
              <textarea
                [(ngModel)]="model.detail"
                name="detail"
                rows="2"
                placeholder="Observaciones de radicación, folios, anexos..."
                class="inp-text"
              ></textarea>
            </label>
          </div>

          <div class="actions">
            <button type="submit" class="btn-primary" [disabled]="saving()">
              {{ saving() ? 'Radicando...' : '💾 Radicar Documento Oficial' }}
            </button>
            <button type="button" class="btn-ghost" (click)="toggle()">Cancelar</button>
            @if (error()) { <span class="error">{{ error() }}</span> }
          </div>
        </form>
      }

      <!-- GUÍA VISUAL DE ESTADOS -->
      <div class="status-guide-card">
        <div class="guide-header">
          <app-icon [icon]="icons.Info" [size]="15" [strokeWidth]="2" />
          <span>Guía oficial de estados de correspondencia</span>
        </div>
        <div class="guide-grid">
          <div class="guide-item pend">
            <span class="guide-emoji">⏳</span>
            <div>
              <strong>PENDIENTE</strong>
              <p>Documento en espera de ser procesado o enviado.</p>
            </div>
          </div>
          <div class="guide-item env">
            <span class="guide-emoji">📤</span>
            <div>
              <strong>ENVIADO</strong>
              <p>Despachado al destinatario, pendiente confirmación.</p>
            </div>
          </div>
          <div class="guide-item rec">
            <span class="guide-emoji">📥</span>
            <div>
              <strong>RECIBIDO</strong>
              <p>Confirmado y recibido por el destinatario en su oficina.</p>
            </div>
          </div>
          <div class="guide-item ent">
            <span class="guide-emoji">✅</span>
            <div>
              <strong>ENTREGADO</strong>
              <p>Firmado y cerrado formalmente en el archivo.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- LISTADO TABLA DE CORRESPONDENCIA -->
      @if (loading()) {
        <p class="loading-msg">Cargando correspondencia...</p>
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Radicado Oficial</th>
                <th>Origen → Destino</th>
                <th>Tipo / Medio</th>
                <th>Asunto</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              @for (r of items(); track r.id) {
                <tr>
                  <td>
                    <strong class="radicado-text">{{ r.documentCode ?? '—' }}</strong>
                    @if (r.voxelsera) {
                      <div class="voxel-tag">📍 {{ r.voxelsera }}</div>
                    }
                  </td>
                  <td>
                    <span class="dept-badge">{{ r.originDept }}</span>
                    <span class="arrow-sep">→</span>
                    <span class="dept-badge">{{ r.destinationDept ?? '—' }}</span>
                  </td>
                  <td>
                    <span class="doc-type-text">{{ r.documentType ?? 'DOC' }}</span>
                    @if (r.medium) {
                      <span class="medium-tag">({{ r.medium }})</span>
                    }
                  </td>
                  <td>
                    <div class="subject-text">{{ r.subject ?? '—' }}</div>
                    @if (r.detail) {
                      <div class="detail-subtext">{{ r.detail }}</div>
                    }
                  </td>
                  <td>
                    <span
                      class="badge"
                      [class.ok]="r.status === 'ENTREGADO' || r.status === 'RECIBIDO'"
                      [class.warn]="r.status === 'PENDIENTE'"
                      [class.info]="r.status === 'ENVIADO'"
                    >
                      {{ r.status }}
                    </span>
                  </td>
                  <td>{{ r.documentDate ?? (r.createdAt | slice: 0:10) }}</td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="muted" style="text-align:center;padding:2rem">Sin correspondencia registrada.</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [
    DOC_STYLES,
    `
    .corr-container { display: flex; flex-direction: column; gap: 1.25rem; }
    
    .form-corr {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 1rem;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .form-header-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #1e40af;
      font-size: 0.95rem;
      margin-bottom: 0.25rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .span-2 { grid-column: span 2; }

    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .label-title { font-size: 0.82rem; font-weight: 700; color: #334155; }
    
    .inp-select, .inp-text {
      font: inherit;
      border: 1px solid #cbd5e1;
      border-radius: 0.55rem;
      padding: 0.6rem 0.8rem;
      background: #f8fafc;
      color: #0f172a;
      font-size: 0.86rem;
      transition: all 0.15s;
    }
    .inp-select:focus, .inp-text:focus {
      border-color: #2563eb;
      background: #ffffff;
      outline: none;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }
    .inp-select.highlight { border-color: #93c5fd; background: #eff6ff; font-weight: 600; color: #1e40af; }
    .inp-radicado {
      font: inherit;
      font-weight: 800;
      color: #1d4ed8;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 0.55rem;
      padding: 0.6rem 0.8rem;
      font-size: 0.9rem;
    }

    /* GUIA DE ESTADOS */
    .status-guide-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.85rem;
      padding: 1rem 1.25rem;
    }
    .guide-header {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.8rem;
      font-weight: 700;
      color: #475569;
      margin-bottom: 0.75rem;
    }
    .guide-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.75rem;
    }
    .guide-item {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.55rem;
      padding: 0.65rem 0.85rem;
      font-size: 0.76rem;
    }
    .guide-item.pend { border-left: 3px solid #f59e0b; }
    .guide-item.env { border-left: 3px solid #3b82f6; }
    .guide-item.rec { border-left: 3px solid #06b6d4; }
    .guide-item.ent { border-left: 3px solid #10b981; }
    .guide-emoji { font-size: 1.1rem; }
    .guide-item strong { display: block; font-size: 0.78rem; color: #1e293b; }
    .guide-item p { margin: 0.15rem 0 0; color: #64748b; font-size: 0.72rem; }

    /* TABLE */
    .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 0.85rem; background: var(--surface); }
    .radicado-text { color: #1e40af; font-size: 0.88rem; }
    .voxel-tag { font-size: 0.72rem; color: #64748b; margin-top: 0.15rem; }
    .dept-badge { background: #f1f5f9; color: #334155; font-weight: 700; font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 0.35rem; }
    .arrow-sep { color: #94a3b8; margin: 0 0.25rem; font-size: 0.75rem; }
    .doc-type-text { font-weight: 600; color: #0f172a; font-size: 0.82rem; }
    .medium-tag { font-size: 0.72rem; color: #64748b; margin-left: 0.25rem; }
    .subject-text { font-size: 0.85rem; font-weight: 600; color: #0f172a; }
    .detail-subtext { font-size: 0.74rem; color: #64748b; margin-top: 0.2rem; }

    @media (max-width: 680px) {
      .form-grid { grid-template-columns: 1fr; }
      .span-2 { grid-column: span 1; }
    }
  `,
  ],
})
export class CorrespondenceScreen implements OnInit {
  private readonly api = inject(DocumentalApiService);
  private readonly auth = inject(AuthService);

  readonly icons = {
    Clock: LucideClock,
    FileText: LucideFileText,
    Inbox: LucideInbox,
    Info: LucideInfo,
    Package: LucidePackage,
    Plus: LucidePlus,
    Send: LucideSend,
    X: LucideX,
  };

  readonly departamentos = DEPARTAMENTOS_CORAZA;
  readonly items = signal<Correspondence[]>([]);
  readonly loading = signal(true);
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly canCreate = computed(() => this.auth.hasPermission('documental.create'));

  readonly seriesDisponibles = signal<TrdOption[]>([]);
  readonly previewCode = signal('Calculando radicado...');

  selectedSerieVal = '100-10.01';

  model = {
    originDept: 'GE',
    destinationDept: 'OP',
    depCode: '100',
    serieCode: '10',
    subserieCode: '01',
    medium: 'FISICO',
    documentType: 'OFICIO',
    documentDate: new Date().toISOString().slice(0, 10),
    subject: '',
    detail: '',
    status: 'PENDIENTE',
    voxelsera: 'VOXEL_D1',
  };

  ngOnInit(): void {
    this.load();
    this.onOriginDeptChange(this.model.originDept);
  }

  toggle(): void {
    this.showForm.update((v) => !v);
    if (this.showForm()) {
      this.refreshPreviewCode();
    }
  }

  onOriginDeptChange(newDept: string): void {
    this.model.originDept = newDept || 'GE';
    const series = MAPA_TRD_COMPLETO[this.model.originDept] || [
      { val: '100-10.01', label: '100-10.01 — GERENCIA / Cartas y Comunicaciones' },
    ];
    this.seriesDisponibles.set(series);
    if (series.length > 0) {
      this.selectedSerieVal = series[0].val;
      this.onSerieChange(this.selectedSerieVal);
    }
  }

  onSerieChange(newSerieVal: string): void {
    this.selectedSerieVal = newSerieVal;
    const parts = this.selectedSerieVal.split('-');
    this.model.depCode = parts[0] || '100';
    const subParts = (parts[1] || '').split('.');
    this.model.serieCode = subParts[0] || '10';
    this.model.subserieCode = subParts[1] || '01';
    this.refreshPreviewCode();
  }

  private refreshPreviewCode(): void {
    const year = new Date().getFullYear();
    const sub = this.model.subserieCode ? `.${this.model.subserieCode}` : '';
    // Preview local inmediato
    const fallback = `${this.model.originDept || this.model.depCode}-${this.model.serieCode}${sub}-${year}-0001`;
    this.previewCode.set(fallback);

    // Consulta exacta al backend
    this.api
      .previewCorrespondenceCode({
        depSigla: this.model.originDept,
        depCode: this.model.depCode,
        serieCode: this.model.serieCode,
        subserieCode: this.model.subserieCode,
      })
      .subscribe({
        next: (res) => {
          if (res && res.code) {
            this.previewCode.set(res.code);
          }
        },
        error: () => {},
      });
  }

  private load(): void {
    this.loading.set(true);
    this.api.listCorrespondence().subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  save(): void {
    if (
      !this.model.originDept ||
      !this.model.destinationDept ||
      !this.model.documentType ||
      !this.model.subject?.trim() ||
      !this.model.voxelsera
    ) {
      this.error.set('⚠️ Debes completar todos los campos obligatorios (*): Dependencia Origen, Destinatario, Tipo Documento, Asunto y Ubicación en Estante.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    const payload = Object.fromEntries(Object.entries(this.model).filter(([, v]) => v !== ''));
    this.api.createCorrespondence(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.model.subject = '';
        this.model.detail = '';
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo radicar la correspondencia.');
      },
    });
  }
}
