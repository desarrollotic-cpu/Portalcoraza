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
        <img src="/brand/logo-coraza-cta.png" width="64" height="64" alt="Portal Coraza" />
        <h1>Portal Vigilante</h1>
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
              placeholder="Ingresa tu número de cédula"
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
              placeholder="••••"
              required
            />
          </label>
          @if (error()) {
            <p class="err">{{ error() }}</p>
          }
          <button type="submit" [disabled]="busy()">
            {{ busy() ? 'Ingresando…' : 'Ingresar al Portal' }}
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
              placeholder="Tu número de cédula"
              required
            />
          </label>
          <label>
            Primer nombre
            <input [(ngModel)]="nombre" name="nombre" autocomplete="given-name" placeholder="Ej. Juan" required />
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
              placeholder="••••"
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
              placeholder="••••"
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

      <a class="back" href="/#/auth/login">← Volver al Portal administrativo</a>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 45%, #2563eb 100%);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 1.5rem 1rem;
    }
    .wrap {
      width: 100%;
      max-width: 440px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
    }
    .brand {
      text-align: center;
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(16px);
      border-radius: 1.25rem 1.25rem 0 0;
      padding: 1.75rem 1.5rem 1.25rem;
      border: 1px solid rgba(255, 255, 255, 0.5);
      border-bottom: 0;
    }
    .brand img {
      filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.12));
    }
    .brand h1 {
      margin: 0.75rem 0 0.25rem;
      color: #0f172a;
      font-size: 1.65rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .brand p {
      margin: 0;
      color: #64748b;
      font-size: 0.88rem;
      line-height: 1.4;
    }
    .card {
      background: #ffffff;
      border-radius: 0 0 1.25rem 1.25rem;
      padding: 1.5rem 1.75rem 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.25);
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
    }
    input {
      font: inherit;
      font-size: 0.95rem;
      font-weight: 500;
      color: #0f172a;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 0.6rem;
      padding: 0.75rem 0.9rem;
      transition: all 0.15s ease;
    }
    input:focus {
      outline: none;
      background: #ffffff;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }
    button[type="submit"] {
      border: 0;
      border-radius: 0.65rem;
      padding: 0.9rem;
      background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
      color: #ffffff;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
      transition: transform 0.1s ease, box-shadow 0.15s ease;
      margin-top: 0.35rem;
    }
    button[type="submit"]:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(37, 99, 235, 0.45);
    }
    button[type="submit"]:active:not(:disabled) {
      transform: translateY(0);
    }
    button:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .linkish {
      background: transparent;
      border: 0;
      color: #2563eb;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 0.4rem;
      cursor: pointer;
      text-align: center;
      transition: color 0.15s ease;
    }
    .linkish:hover {
      color: #1d4ed8;
      text-decoration: underline;
    }
    .err {
      color: #dc2626;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 0.5rem;
      padding: 0.65rem 0.85rem;
      margin: 0;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .back {
      color: rgba(255, 255, 255, 0.9);
      text-align: center;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 500;
      margin-top: 1.25rem;
      transition: color 0.15s ease;
    }
    .back:hover {
      color: #ffffff;
      text-decoration: underline;
    }
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
