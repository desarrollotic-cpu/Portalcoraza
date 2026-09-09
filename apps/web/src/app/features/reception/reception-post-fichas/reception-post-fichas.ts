import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  OperacionesApiService,
  OperacionesPost,
  PostContractRow,
} from '../../operaciones/operaciones-api.service';

function zoneNumber(zone: string | null | undefined): number {
  const n = Number(String(zone ?? '').match(/\d+/)?.[0]);
  return Number.isFinite(n) ? n : -1;
}

function bascLabel(v: string | boolean | null | undefined): string {
  if (v === 'SI' || v === true) return 'Sí';
  if (v === 'NO_APLICA' || v === false) return 'No aplica';
  return '—';
}

@Component({
  selector: 'app-reception-post-fichas',
  imports: [FormsModule, DatePipe],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Fichas de puestos</h2>
          <p>Consulta la ficha completa. Para crear o editar usa Gestionar puestos.</p>
        </div>
        <input
          type="search"
          placeholder="Buscar nombre, NIT o cliente…"
          [ngModel]="query()"
          (ngModelChange)="query.set($event)"
        />
      </header>

      @if (loading()) {
        <p>Cargando...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <div class="layout">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>NIT</th>
                  <th>Zona</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (p of filtered(); track p.id) {
                  <tr [class.active]="selected()?.id === p.id">
                    <td><strong>{{ p.name }}</strong></td>
                    <td>{{ p.nit || '—' }}</td>
                    <td>{{ p.zone || '—' }}</td>
                    <td>{{ p.status }}</td>
                    <td>
                      <button type="button" class="link" (click)="selected.set(p)">Ver ficha</button>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="muted">No hay puestos con ese filtro.</td></tr>
                }
              </tbody>
            </table>
          </div>

          @if (selected(); as p) {
            <article class="ficha">
              <header>
                <h3>{{ p.name }}</h3>
                <p class="muted">{{ p.status }} · actualizado {{ p.updatedAt | date: 'dd/MM/yyyy' }}</p>
              </header>

              <section>
                <h4>Identificación</h4>
                <dl>
                  <dt>NIT</dt><dd>{{ p.nit || '—' }}</dd>
                  <dt>Sector</dt><dd>{{ p.sector || '—' }}</dd>
                  <dt>Cliente</dt><dd>{{ p.clientName || '—' }}</dd>
                </dl>
              </section>

              <section>
                <h4>Contratos</h4>
                @for (c of contractsOf(p); track $index) {
                  <div class="card">
                    <strong>Contrato {{ $index + 1 }}</strong>
                    <dl>
                      <dt>N.º</dt><dd>{{ c.contractNumber || '—' }}</dd>
                      <dt>Fecha inicial</dt><dd>{{ c.contractStart || '—' }}</dd>
                      <dt>Tiempo</dt><dd>{{ c.contractTerm || '—' }}</dd>
                      <dt>Fecha final</dt><dd>{{ c.contractEnd || '—' }}</dd>
                      <dt>BASC</dt><dd>{{ bascLabel(c.basc) }}</dd>
                      <dt>Tipo de servicio</dt><dd>{{ c.serviceType || '—' }}</dd>
                      <dt>Valor de factura</dt><dd>{{ c.invoiceValue || '—' }}</dd>
                      <dt>Armamento</dt><dd>{{ c.armed ? 'Sí' : 'No' }}</dd>
                    </dl>
                  </div>
                } @empty {
                  <p class="muted">Sin contratos.</p>
                }
              </section>

              <section>
                <h4>Otrosí</h4>
                @for (o of p.otrosi ?? []; track $index) {
                  <div class="card">
                    <strong>Otro sí {{ $index + 1 }}</strong>
                    <dl>
                      <dt>N.º</dt><dd>{{ o.number || '—' }}</dd>
                      <dt>Tipo</dt><dd>{{ o.typeText || '—' }}</dd>
                      <dt>Fecha</dt><dd>{{ o.dateText || '—' }}</dd>
                      <dt>Valor</dt><dd>{{ o.invoiceValue || '—' }}</dd>
                      <dt>Tipo de servicio</dt><dd>{{ o.serviceType || '—' }}</dd>
                    </dl>
                  </div>
                } @empty {
                  <p class="muted">Sin otrosí.</p>
                }
              </section>

              <section>
                <h4>Ubicación y contacto</h4>
                <dl>
                  <dt>Dirección</dt><dd>{{ p.address || '—' }}</dd>
                  <dt>Ciudad</dt><dd>{{ p.city || '—' }}</dd>
                  <dt>Zona</dt><dd>{{ p.zone || '—' }}</dd>
                  <dt>Rep. legal</dt><dd>{{ p.legalRepName || '—' }}</dd>
                  <dt>Cédula RL</dt><dd>{{ p.legalRepId || '—' }}</dd>
                  <dt>Contacto</dt><dd>{{ p.contactName || '—' }}</dd>
                  <dt>Teléfono</dt><dd>{{ p.phone || '—' }}</dd>
                  <dt>Email</dt><dd>{{ p.contactEmail || '—' }}</dd>
                </dl>
              </section>

              @if (p.observations || p.notes || p.requirements || p.instructions) {
                <section>
                  <h4>Notas</h4>
                  @if (p.requirements) { <p><strong>Requisitos:</strong> {{ p.requirements }}</p> }
                  @if (p.instructions) { <p><strong>Instrucciones:</strong> {{ p.instructions }}</p> }
                  @if (p.notes) { <p><strong>Notas:</strong> {{ p.notes }}</p> }
                  @if (p.observations) { <p><strong>Observaciones:</strong> {{ p.observations }}</p> }
                </section>
              }
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 1rem; }
    .head { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .head h2 { margin: 0 0 0.25rem; font-size: 1.15rem; }
    .head p { margin: 0; color: var(--text-muted, #6b7280); font-size: 0.9rem; max-width: 36rem; }
    input[type='search'] {
      border: 1px solid var(--border, #d1d5db); border-radius: 8px;
      padding: 0.45rem 0.65rem; min-width: 240px; font: inherit;
    }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 0.9fr); gap: 1rem; align-items: start; }
    .table-wrap { overflow: auto; border: 1px solid var(--border, #e5e7eb); border-radius: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { padding: 0.65rem 0.75rem; text-align: left; border-bottom: 1px solid var(--border, #eee); }
    tr.active { background: color-mix(in srgb, var(--primary, #1d4ed8) 8%, #fff); }
    button.link { border: none; background: none; color: var(--coraza-primary, #1d4ed8); cursor: pointer; font: inherit; }
    .ficha {
      border: 1px solid var(--border, #e5e7eb); border-radius: 12px; padding: 1rem;
      background: #fff; display: flex; flex-direction: column; gap: 0.85rem;
    }
    .ficha h3 { margin: 0; }
    .ficha h4 { margin: 0 0 0.4rem; font-size: 0.88rem; }
    .card { border: 1px solid var(--border, #eee); border-radius: 8px; padding: 0.65rem; margin-bottom: 0.5rem; }
    dl { display: grid; grid-template-columns: 9rem 1fr; gap: 0.25rem 0.75rem; margin: 0.4rem 0 0; font-size: 0.85rem; }
    dt { color: var(--text-muted, #6b7280); }
    dd { margin: 0; }
    .muted { color: var(--text-muted, #6b7280); }
    .error { color: #b91c1c; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
  `,
})
export class ReceptionPostFichas implements OnInit {
  private readonly api = inject(OperacionesApiService);

  readonly posts = signal<OperacionesPost[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly query = signal('');
  readonly selected = signal<OperacionesPost | null>(null);
  readonly bascLabel = bascLabel;

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.posts()
      .filter((p) => {
        if (!q) return true;
        return [p.name, p.nit ?? '', p.clientName ?? '', p.zone ?? '']
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        const z = zoneNumber(b.zone) - zoneNumber(a.zone);
        return z || a.name.localeCompare(b.name, 'es');
      });
  });

  ngOnInit(): void {
    this.api.listPosts().subscribe({
      next: (rows) => {
        this.posts.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar las fichas.');
      },
    });
  }

  contractsOf(p: OperacionesPost): PostContractRow[] {
    if (p.contracts?.length) return p.contracts;
    if (p.contractNumber || p.contractStart || p.serviceType) {
      return [
        {
          contractNumber: p.contractNumber,
          contractStart: p.contractStart,
          contractTerm: p.contractTerm,
          contractEnd: p.contractEnd,
          basc: p.basc === true ? 'SI' : p.basc === false ? 'NO_APLICA' : null,
          serviceType: p.serviceType,
          invoiceValue: null,
          armed: !!p.armed,
        },
      ];
    }
    return [];
  }
}
