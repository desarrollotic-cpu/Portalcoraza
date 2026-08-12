import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VigiaAuthService } from '../vigia-auth.service';

@Component({
  selector: 'app-vigia-login',
  imports: [FormsModule],
  template: `
    <div class="wrap">
      <div class="brand">
        <img src="/brand/logo-coraza-cta.png" width="56" height="56" alt="Coraza" />
        <h1>Coraza Vigía</h1>
        <p>Acceso vigilantes — cédula y primer nombre</p>
      </div>
      <form class="card" (ngSubmit)="submit()">
        <label>
          Cédula
          <input [(ngModel)]="cedula" name="cedula" inputmode="numeric" autocomplete="username" required />
        </label>
        <label>
          Primer nombre
          <input [(ngModel)]="nombre" name="nombre" autocomplete="given-name" required />
        </label>
        @if (error()) {
          <p class="err">{{ error() }}</p>
        }
        <button type="submit" [disabled]="busy()">{{ busy() ? 'Ingresando…' : 'Ingresar' }}</button>
      </form>
      <a class="back" href="/auth/login">← Portal administrativo</a>
    </div>
  `,
  styles: `
    :host { display:block; min-height:100dvh; background:#0A0E17; color:#F1F5F9; font-family: system-ui,sans-serif; }
    .wrap { max-width:420px; margin:0 auto; padding:2rem 1.25rem; display:flex; flex-direction:column; gap:1.25rem; }
    .brand { text-align:center; }
    .brand h1 { margin:0.6rem 0 0.2rem; color:#FFB700; font-size:1.6rem; }
    .brand p { margin:0; color:#94A3B8; font-size:0.9rem; }
    .card { background:#121824; border-radius:1rem; padding:1.25rem; display:flex; flex-direction:column; gap:0.85rem; }
    label { display:flex; flex-direction:column; gap:0.35rem; font-size:0.85rem; font-weight:600; color:#94A3B8; }
    input { font:inherit; font-weight:400; color:#F1F5F9; background:#0A0E17; border:1px solid #1e293b; border-radius:0.55rem; padding:0.7rem 0.8rem; }
    button { border:0; border-radius:0.65rem; padding:0.85rem; background:#FFB700; color:#0A0E17; font-weight:800; cursor:pointer; }
    button:disabled { opacity:0.6; }
    .err { color:#EF4444; margin:0; font-size:0.85rem; }
    .back { color:#94A3B8; text-align:center; text-decoration:none; font-size:0.85rem; }
  `,
})
export class VigiaLogin {
  private readonly auth = inject(VigiaAuthService);
  private readonly router = inject(Router);

  cedula = '';
  nombre = '';
  readonly busy = signal(false);
  readonly error = signal('');

  submit(): void {
    this.error.set('');
    this.busy.set(true);
    this.auth.login(this.cedula, this.nombre).subscribe({
      next: () => {
        this.busy.set(false);
        void this.router.navigateByUrl('/vigia');
      },
      error: (e) => {
        // Fallback offline local si API no responde
        if (!e?.status || e.status === 0) {
          if (this.auth.loginOffline(this.cedula, this.nombre)) {
            this.busy.set(false);
            void this.router.navigateByUrl('/vigia');
            return;
          }
        }
        this.busy.set(false);
        this.error.set(e?.error?.message || 'No se pudo iniciar sesión');
      },
    });
  }
}
