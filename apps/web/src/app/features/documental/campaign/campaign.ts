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
      El membrete es el de Campaña · Gestión Documental y la carta pide no responder. Cambie el asunto y el texto para la siguiente.
      Solo reciben quienes están activos y tienen correo.
    </p>

    @if (audience(); as a) {
      <p class="badge info">{{ a.withEmail }} con correo · {{ a.withoutEmail }} activos sin correo</p>
    }

    <form class="card" (ngSubmit)="preview()">
      <label class="full">Asunto
        <input [(ngModel)]="subject" name="subject" maxlength="140" required />
      </label>
      <label class="full">Título del cartel
        <input [(ngModel)]="banner" name="banner" maxlength="140" required />
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

  subject = 'Escriba bien cuando reciba correspondencia';
  banner = 'Al recibir correspondencia, deje todo claro';
  body =
    'Cada documento que llega a la empresa tiene dueño, fecha y hora.\n\nSi usted lo recibe, su registro es la prueba de que llegó.';
  includeImage = false;
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
    this.api.campaignPreview({ to: this.testTo.trim(), subject: this.subject, body: this.body, includeImage: this.includeImage, banner: this.banner }).subscribe({
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
    this.api.campaignSend({ subject: this.subject, body: this.body, includeImage: this.includeImage, banner: this.banner }).subscribe({
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
