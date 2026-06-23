import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Associate, AssociatesApiService } from '../../rrhh/associates-api.service';
import { InventoryApiService, InventoryVariant } from '../inventory-api.service';

@Component({
  selector: 'app-delivery-form',
  imports: [ReactiveFormsModule],
  template: `
    <section>
      <h2>{{ title() }}</h2>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      @if (!signOnly()) {
        <form [formGroup]="form">
          <label>Asociado
            <select formControlName="associateId">
              <option value="">Seleccione...</option>
              @for (a of associates(); track a.id) {
                <option [value]="a.id">{{ associateLabel(a) }}</option>
              }
            </select>
          </label>

          <h3>Ítems</h3>
          @for (line of lines.controls; track $index) {
            <div class="line" [formGroup]="line">
              <select formControlName="variantId">
                <option value="">Variante...</option>
                @for (v of variants(); track v.id) {
                  <option [value]="v.id">{{ variantLabel(v) }}</option>
                }
              </select>
              <input formControlName="quantity" type="number" min="1" placeholder="Cant." />
            </div>
          }
          <button type="button" (click)="addLine()">+ Línea</button>
        </form>
      } @else {
        <p>Entrega pendiente. El asociado debe firmar para confirmar.</p>
      }

      <h3>Firma manuscrita</h3>
      <div class="signature-box">
        <canvas #canvas width="500" height="180"></canvas>
        <button type="button" (click)="clearSignature()">Limpiar firma</button>
      </div>

      <div class="actions">
        <button type="button" (click)="cancel()">Cancelar</button>
        <button type="button" (click)="submit()" [disabled]="saving() || !canSubmit()">
          {{ submitLabel() }}
        </button>
      </div>
    </section>
  `,
  styles: `
    label { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1rem; max-width: 400px; }
    select, input { padding: 0.5rem; border: 1px solid var(--coraza-border); border-radius: 8px; }
    .line { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center; }
    .line select { flex: 1; }
    .line input { width: 100px; }
    .signature-box { margin: 1rem 0; }
    canvas {
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      background: #fff;
      touch-action: none;
      cursor: crosshair;
      display: block;
    }
    .actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
    .error { color: var(--coraza-error); }
  `,
})
export class DeliveryForm implements OnInit, AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(InventoryApiService);
  private readonly associatesApi = inject(AssociatesApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private ctx: CanvasRenderingContext2D | null = null;
  private drawing = false;
  private hasStroke = false;

  readonly deliveryId = signal<string | null>(null);
  readonly signOnly = signal(false);
  readonly associates = signal<Associate[]>([]);
  readonly variants = signal<InventoryVariant[]>([]);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly title = computed(() =>
    this.signOnly() ? 'Firmar entrega' : 'Nueva entrega',
  );

  readonly submitLabel = computed(() =>
    this.signOnly() ? 'Confirmar con firma' : 'Crear y confirmar entrega',
  );

  readonly form = this.fb.group({
    associateId: ['', Validators.required],
  });

  readonly lines = this.fb.array([
    this.fb.group({
      variantId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
    }),
  ]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const firmar = this.route.snapshot.url.some((s) => s.path === 'firmar');

    if (id && firmar) {
      this.deliveryId.set(id);
      this.signOnly.set(true);
    }

    forkJoin({
      associates: this.associatesApi.list('ACTIVO'),
      variants: this.api.listVariants(),
    }).subscribe({
      next: ({ associates, variants }) => {
        this.associates.set(associates);
        this.variants.set(variants);
      },
      error: () => this.error.set('No se pudieron cargar datos'),
    });
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    if (this.ctx) {
      this.ctx.strokeStyle = '#1a237e';
      this.ctx.lineWidth = 2;
      this.ctx.lineCap = 'round';
    }

    const start = (x: number, y: number) => {
      if (!this.ctx) return;
      this.drawing = true;
      this.hasStroke = true;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
    };

    const move = (x: number, y: number) => {
      if (!this.drawing || !this.ctx) return;
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
    };

    const end = () => {
      this.drawing = false;
    };

    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      start(e.clientX - rect.left, e.clientY - rect.top);
    });
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      move(e.clientX - rect.left, e.clientY - rect.top);
    });
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);

    canvas.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        const t = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        start(t.clientX - rect.left, t.clientY - rect.top);
      },
      { passive: false },
    );
    canvas.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault();
        const t = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        move(t.clientX - rect.left, t.clientY - rect.top);
      },
      { passive: false },
    );
    canvas.addEventListener('touchend', end);
  }

  addLine(): void {
    this.lines.push(
      this.fb.group({
        variantId: ['', Validators.required],
        quantity: [1, [Validators.required, Validators.min(1)]],
      }),
    );
  }

  clearSignature(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.ctx) return;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.hasStroke = false;
  }

  canSubmit(): boolean {
    if (!this.hasStroke) return false;
    if (this.signOnly()) return true;
    return this.form.valid && this.lines.valid;
  }

  submit(): void {
    if (!this.canSubmit()) return;

    const signatureData = this.canvasRef.nativeElement.toDataURL('image/png');
    this.saving.set(true);
    this.error.set(null);

    const existingId = this.deliveryId();
    if (existingId) {
      this.api.signDelivery(existingId, signatureData).subscribe({
        next: () => this.router.navigate(['/dotacion/entregas']),
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.error?.message ?? 'No se pudo confirmar la entrega');
        },
      });
      return;
    }

    const associateId = this.form.getRawValue().associateId!;
    const items = this.lines.getRawValue().map((l) => ({
      variantId: l.variantId!,
      quantity: Number(l.quantity),
    }));

    this.api.createDelivery({ associateId, items }).subscribe({
      next: (delivery) => {
        this.api.signDelivery(delivery.id, signatureData).subscribe({
          next: () => this.router.navigate(['/dotacion/entregas']),
          error: (err) => {
            this.saving.set(false);
            this.error.set(
              err.error?.message ??
                'Entrega creada pero falló la firma. Firma desde la lista.',
            );
            this.router.navigate(['/dotacion/entregas']);
          },
        });
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo crear la entrega');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/dotacion/entregas']);
  }

  associateLabel(a: Associate): string {
    const name = [a.firstName, a.lastName].filter(Boolean).join(' ');
    return name ? `${name} (${a.documentNumber ?? 's/doc'})` : (a.documentNumber ?? a.id);
  }

  variantLabel(v: InventoryVariant): string {
    const attrs = Object.entries(v.attributes ?? {})
      .map(([k, val]) => `${k}:${String(val)}`)
      .join(' ');
    return `${v.sku} — stock ${v.stockCurrent}${attrs ? ` (${attrs})` : ''}`;
  }
}
