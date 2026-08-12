import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VigiaAuthService } from '../vigia-auth.service';

type Mode = 'login' | 'setup' | 'reset';

@Component({
  selector: 'app-vigia-login',
  imports: [FormsModule],
  template: `
    <div class="wrap">
      <div class="brand">
        <img src="/brand/logo-coraza-cta.png" width="56" height="56" alt="Coraza" />
        <h1>Coraza Vigía</h1>
        <p>
          @switch (mode()) {
            @case ('login') {
              Acceso con cédula y PIN de 4 dígitos
            }
            @case ('setup') {
              Primera vez: crea tu PIN con cédula y primer nombre
            }
            @case ('reset') {
              Restablecer PIN: verifica cédula y primer nombre
            }
          }
        </p>
      </div>

      @if (mode() === 'login') {
        <form class="card" (ngSubmit)="submitLogin()">
          <label>
            Cédula
            <input
              [(ngModel)]="cedula"
              name="cedula"
              inputmode="numeric"
              autocomplete="username"
              required
            />
          </label>
          <label>
            PIN (4 dígitos)
            <input
              [(ngModel)]="pin"
              name="pin"
              type="password"
              inputmode="numeric"
              maxlength="4"
              pattern="[0-9]{4}"
              autocomplete="current-password"
              required
            />
          </label>
          @if (error()) {
            <p class="err">{{ error() }}</p>
          }
          <button type="submit" [disabled]="busy()">
            {{ busy() ? 'Ingresando…' : 'Ingresar' }}
          </button>
          <button type="button" class="linkish" (click)="go('setup')">
            ¿Primera vez? Crear mi PIN
          </button>
          <button type="button" class="linkish" (click)="go('reset')">
            Olvidé mi PIN
          </button>
        </form>
      } @else {
        <form class="card" (ngSubmit)="submitIdentityPin()">
          <label>
            Cédula
            <input
              [(ngModel)]="cedula"
              name="cedula"
              inputmode="numeric"
              autocomplete="username"
              required
            />
          </label>
          <label>
            Primer nombre
            <input [(ngModel)]="nombre" name="nombre" autocomplete="given-name" required />
          </label>
          <label>
            {{ mode() === 'reset' ? 'Nuevo PIN (4 dígitos)' : 'Elige tu PIN (4 dígitos)' }}
            <input
              [(ngModel)]="pin"
              name="pin"
              type="password"
              inputmode="numeric"
              maxlength="4"
              pattern="[0-9]{4}"
              autocomplete="new-password"
              required
            />
          </label>
          <label>
            Confirma el PIN
            <input
              [(ngModel)]="pin2"
              name="pin2"
              type="password"
              inputmode="numeric"
              maxlength="4"
              pattern="[0-9]{4}"
              autocomplete="new-password"
              required
            />
          </label>
          @if (error()) {
            <p class="err">{{ error() }}</p>
          }
          <button type="submit" [disabled]="busy()">
            @if (busy()) {
              Guardando…
            } @else if (mode() === 'reset') {
              Restablecer e ingresar
            } @else {
              Crear PIN e ingresar
            }
          </button>
          <button type="button" class="linkish" (click)="go('login')">
            Ya tengo PIN — volver
          </button>
        </form>
      }

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
    input { font:inherit; font-weight:400; color:#F1F5F9; background:#0A0E17; border:1px solid #1e293b; border-radius:0.55rem; padding:0.7rem 0.8rem; letter-spacing:0.08em; }
    button { border:0; border-radius:0.65rem; padding:0.85rem; background:#FFB700; color:#0A0E17; font-weight:800; cursor:pointer; }
    button:disabled { opacity:0.6; }
    .linkish { background:transparent; color:#FFB700; font-weight:600; padding:0.35rem; }
    .err { color:#EF4444; margin:0; font-size:0.85rem; }
    .back { color:#94A3B8; text-align:center; text-decoration:none; font-size:0.85rem; }
  `,
})
export class VigiaLogin {
  private readonly auth = inject(VigiaAuthService);
  private readonly router = inject(Router);

  cedula = '';
  nombre = '';
  pin = '';
  pin2 = '';
  readonly mode = signal<Mode>('login');
  readonly busy = signal(false);
  readonly error = signal('');

  go(m: Mode): void {
    this.mode.set(m);
    this.error.set('');
    this.pin = '';
    this.pin2 = '';
  }

  private validatePinPair(): string | null {
    const pin = this.pin.replace(/\D/g, '');
    const pin2 = this.pin2.replace(/\D/g, '');
    if (!/^\d{4}$/.test(pin)) {
      this.error.set('El PIN debe ser exactamente 4 dígitos');
      return null;
    }
    if (/^(\d)\1{3}$/.test(pin)) {
      this.error.set('PIN demasiado débil: no uses 4 dígitos iguales');
      return null;
    }
    if (pin !== pin2) {
      this.error.set('Los PIN no coinciden');
      return null;
    }
    return pin;
  }

  submitLogin(): void {
    this.error.set('');
    const pin = this.pin.replace(/\D/g, '');
    if (!/^\d{4}$/.test(pin)) {
      this.error.set('El PIN debe ser exactamente 4 dígitos');
      return;
    }
    this.busy.set(true);
    this.auth.login(this.cedula, pin).subscribe({
      next: () => {
        this.busy.set(false);
        void this.router.navigateByUrl('/vigia');
      },
      error: (e) => {
        if (!e?.status || e.status === 0) {
          this.auth.loginOffline(this.cedula, pin).subscribe((ok) => {
            this.busy.set(false);
            if (ok) {
              void this.router.navigateByUrl('/vigia');
              return;
            }
            this.error.set('Sin conexión y no hay PIN guardado en este dispositivo');
          });
          return;
        }
        this.busy.set(false);
        const msg = Array.isArray(e?.error?.message)
          ? e.error.message.join(' ')
          : e?.error?.message;
        this.error.set(msg || 'No se pudo iniciar sesión');
      },
    });
  }

  submitIdentityPin(): void {
    this.error.set('');
    const pin = this.validatePinPair();
    if (!pin) return;
    this.busy.set(true);
    const req =
      this.mode() === 'reset'
        ? this.auth.resetPin(this.cedula, this.nombre, pin)
        : this.auth.setupPin(this.cedula, this.nombre, pin);
    req.subscribe({
      next: () => {
        this.busy.set(false);
        void this.router.navigateByUrl('/vigia');
      },
      error: (e) => {
        this.busy.set(false);
        const msg = Array.isArray(e?.error?.message)
          ? e.error.message.join(' ')
          : e?.error?.message;
        this.error.set(msg || 'No se pudo guardar el PIN');
      },
    });
  }
}
