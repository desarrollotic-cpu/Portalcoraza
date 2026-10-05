import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DocumentalApiService } from '../documental-api.service';
import { DOC_STYLES } from '../documental.styles';

@Component({
  selector: 'app-doc-campaign',
  imports: [FormsModule],
  template: `
    <h3>Campaña a asociados activos</h3>
    <p class="muted">
      La carta ya trae la ilustración y el aviso de la minuta. El texto de abajo es el saludo de cada persona.
      Solo reciben quienes están activos y tienen correo.
    </p>

    @if (audience(); as a) {
      <p class="badge info">{{ a.withEmail }} con correo · {{ a.withoutEmail }} activos sin correo</p>
    }

    <form class="card" (ngSubmit)="preview()">
      <label class="full">Asunto
        <input [(ngModel)]="subject" name="subject" maxlength="140" required />
      </label>
      <label class="full">Mensaje
        <textarea [(ngModel)]="body" name="body" rows="8" maxlength="4000" required placeholder="Escriba el comunicado. Un renglón en blanco separa párrafos."></textarea>
      </label>
      <label>Correo de prueba
        <input type="email" [(ngModel)]="testTo" name="testTo" placeholder="su correo" />
      </label>
      <div class="actions">
        <button type="submit" class="btn-ghost" [disabled]="busy()">Enviar prueba</button>
        <button type="button" class="btn-primary" [disabled]="busy() || status()?.running" (click)="sendAll()">
          Enviar a todos los activos
        </button>
      </div>
    </form>

    @if (status(); as s) {
      @if (s.running || s.total) {
        <p>Enviados {{ s.sent }} de {{ s.total }}. Fallidos {{ s.failed }}.
          @if (s.running) { Sigue en curso. }
          @else { Campaña terminada. }
        </p>
      }
      @if (s.lastError) {
        <p class="error">{{ s.lastError }}</p>
      }
    }
    @if (notice()) {
      <p>{{ notice() }}</p>
    }
  `,
  styles: DOC_STYLES,
})
export class CampaignScreen implements OnInit, OnDestroy {
  private readonly api = inject(DocumentalApiService);
  private timer: ReturnType<typeof setInterval> | null = null;

  subject = 'Marque la minuta con el puesto, de forma clara';
  body =
    'La minuta de cada puesto es el registro del servicio. Para que Gestión Documental pueda archivarla donde corresponde, el nombre del puesto tiene que verse claro y completo.\n\nEscríbalo despacio y con letra legible. Una sigla suelta, un tachón o una marca que no se lee deja la minuta sin puesto.';
  testTo = '';
  readonly audience = signal<{ active: number; withEmail: number; withoutEmail: number } | null>(null);
  readonly status = signal<{
    running: boolean;
    total: number;
    sent: number;
    failed: number;
    lastError: string | null;
  } | null>(null);
  readonly busy = signal(false);
  readonly notice = signal('');

  ngOnInit(): void {
    this.api.campaignAudience().subscribe({
      next: (row) => this.audience.set(row),
      error: () => this.notice.set('No se pudo contar la audiencia'),
    });
    this.poll();
    this.timer = setInterval(() => this.poll(), 2000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  preview(): void {
    if (!this.testTo.trim()) {
      this.notice.set('Escriba un correo de prueba');
      return;
    }
    this.busy.set(true);
    this.api.campaignPreview({ to: this.testTo.trim(), subject: this.subject, body: this.body }).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.notice.set(res.ok ? 'Prueba enviada. Revise la bandeja.' : res.error || 'No se pudo enviar la prueba');
      },
      error: (err) => {
        this.busy.set(false);
        this.notice.set(err.error?.message || 'No se pudo enviar la prueba');
      },
    });
  }

  sendAll(): void {
    const n = this.audience()?.withEmail ?? 0;
    if (!confirm(`Se enviará el comunicado a ${n} asociados activos. ¿Continuar?`)) return;
    this.busy.set(true);
    this.api.campaignSend({ subject: this.subject, body: this.body }).subscribe({
      next: (row) => {
        this.busy.set(false);
        this.notice.set(`Campaña iniciada para ${row.total} personas`);
        this.poll();
      },
      error: (err) => {
        this.busy.set(false);
        this.notice.set(err.error?.message || 'No se pudo iniciar');
      },
    });
  }

  private poll(): void {
    this.api.campaignStatus().subscribe({
      next: (row) => this.status.set(row),
      error: () => undefined,
    });
  }
}
