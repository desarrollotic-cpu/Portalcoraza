import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideEye,
  LucideEyeOff,
  LucideKeyRound,
  LucideLogIn,
  LucideMail,
  LucideShieldCheck,
} from '@lucide/angular';
import { AuthService } from '../../../core/services/auth.service';
import { Icon } from '../../../shared/components/icon/icon';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, Icon],
  template: `
    <div class="login-wrap">
    <form class="login-form" [formGroup]="form" (ngSubmit)="submit()">
      <div class="badge">
        <app-icon [icon]="icons.ShieldCheck" [size]="14" [strokeWidth]="2.4" />
        Acceso seguro
      </div>

      <h1>Bienvenido de vuelta</h1>
      <p class="subtitle">Ingresa a tu portal operativo Coraza.</p>

      @if (error()) {
        <div class="alert" role="alert">
          <span class="alert-dot"></span>
          {{ error() }}
        </div>
      }

      <div class="field">
        <label for="email">Correo electrónico</label>
        <div class="input-wrap">
          <app-icon class="input-icon" [icon]="icons.Mail" [size]="18" [strokeWidth]="1.8" />
          <input
            id="email"
            type="text"
            inputmode="email"
            formControlName="email"
            autocomplete="username"
            placeholder="admin@coraza.local"
          />
        </div>
      </div>

      <div class="field">
        <label for="password">Contraseña</label>
        <div class="input-wrap">
          <app-icon class="input-icon" [icon]="icons.KeyRound" [size]="18" [strokeWidth]="1.8" />
          <input
            id="password"
            [type]="showPassword() ? 'text' : 'password'"
            formControlName="password"
            autocomplete="current-password"
            placeholder="••••••••"
          />
          <button
            type="button"
            class="toggle-pw"
            (click)="showPassword.set(!showPassword())"
            [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          >
            <app-icon
              [icon]="showPassword() ? icons.EyeOff : icons.Eye"
              [size]="18"
              [strokeWidth]="1.8"
            />
          </button>
        </div>
      </div>

      <button
        type="submit"
        class="submit-btn"
        [disabled]="form.invalid || loading()"
      >
        @if (loading()) {
          <span class="spinner"></span>
          Ingresando...
        } @else {
          <app-icon [icon]="icons.LogIn" [size]="18" [strokeWidth]="2" />
          Ingresar
        }
      </button>

      <p class="foot-note">
        ¿Olvidaste tu clave? Pide al administrador que la restablezca. Si eres el admin y no
        recuerdas la tuya,
        <button type="button" class="linkish" (click)="showRecover.set(!showRecover())">
          recupera el acceso aquí
        </button>
        .
      </p>
    </form>

      @if (showRecover()) {
        <div class="recover-box">
          <h2>Recuperar administrador</h2>
          <p>
            Usa la clave de recuperación del servidor (<code>ADMIN_RECOVERY_SECRET</code>) o el
            comando <code>npm run reset:admin-password</code>.
          </p>
          @if (recoverError()) {
            <div class="alert" role="alert">
              <span class="alert-dot"></span>
              {{ recoverError() }}
            </div>
          }
          @if (recoverSuccess()) {
            <div class="alert ok" role="status">{{ recoverSuccess() }}</div>
          }
          <form class="recover-form" [formGroup]="recoverForm" (ngSubmit)="submitRecover()">
            <div class="field">
              <label for="recoveryKey">Clave de recuperación</label>
              <input id="recoveryKey" type="password" formControlName="recoveryKey" autocomplete="off" />
            </div>
            <div class="field">
              <label for="newAdminPassword">Nueva contraseña</label>
              <input
                id="newAdminPassword"
                type="password"
                formControlName="newPassword"
                autocomplete="new-password"
              />
            </div>
            <button type="submit" class="submit-btn secondary" [disabled]="recoverForm.invalid || recoverLoading()">
              {{ recoverLoading() ? 'Restableciendo...' : 'Restablecer admin' }}
            </button>
          </form>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    .login-wrap {
      width: 100%;
    }

    .login-form {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0;
      text-align: left;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.7rem;
      background: var(--primary-50);
      color: var(--primary-700);
      border: 1px solid var(--primary-100);
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      align-self: flex-start;
      margin-bottom: 1.25rem;
    }

    h1 {
      margin: 0 0 0.4rem;
      font-family: var(--font-display);
      font-size: 1.85rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.02em;
      line-height: 1.15;
    }

    .subtitle {
      margin: 0 0 1.85rem;
      color: var(--text-secondary);
      font-size: 0.95rem;
      line-height: 1.5;
    }

    .alert {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.65rem 0.85rem;
      margin: 0 0 1.25rem;
      background: var(--error-bg);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: var(--radius-sm);
      color: var(--error-dark);
      font-size: 0.85rem;
    }

    .alert-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--error);
      box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.18);
    }

    .field {
      margin-bottom: 1.2rem;
    }

    label {
      display: block;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.45rem;
      letter-spacing: 0.01em;
    }

    .input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 0.95rem;
      color: var(--text-muted);
      pointer-events: none;
    }

    .input-wrap input {
      width: 100%;
      padding: 0.85rem 0.95rem 0.85rem 2.65rem;
      background: rgba(255, 255, 255, 0.6);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 0.95rem;
      color: var(--text-primary);
      transition:
        border-color 0.18s ease,
        box-shadow 0.18s ease,
        background 0.18s ease;
    }

    .input-wrap input::placeholder {
      color: var(--neutral-400);
    }

    .input-wrap input:hover {
      border-color: var(--border-strong);
      background: #fff;
    }

    .input-wrap input:focus {
      outline: none;
      border-color: var(--primary-500);
      background: #fff;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
    }

    .input-wrap:focus-within .input-icon {
      color: var(--primary-500);
    }

    .toggle-pw {
      position: absolute;
      right: 0.75rem;
      border: none;
      background: transparent;
      padding: 0.35rem;
      cursor: pointer;
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      transition: color 0.15s ease, background 0.15s ease;
    }

    .toggle-pw:hover {
      color: var(--primary-600);
      background: var(--primary-50);
    }

    .submit-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.55rem;
      width: 100%;
      margin-top: 0.5rem;
      padding: 0.95rem 1.5rem;
      border: none;
      border-radius: var(--radius-sm);
      font-size: 0.95rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      cursor: pointer;
      color: var(--text-on-primary);
      background: var(--gradient-primary);
      background-size: 200% 200%;
      background-position: 0% 0%;
      box-shadow: var(--shadow-primary);
      transition:
        transform 0.18s ease,
        box-shadow 0.18s ease,
        background-position 0.4s ease;
    }

    .submit-btn:hover:not(:disabled) {
      background-position: 100% 100%;
      transform: translateY(-1px);
      box-shadow: 0 16px 32px rgba(99, 102, 241, 0.35);
    }

    .submit-btn:active:not(:disabled) {
      transform: translateY(0);
    }

    .submit-btn:disabled {
      cursor: not-allowed;
      opacity: 0.55;
      box-shadow: none;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.35);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .foot-note {
      margin: 1.5rem 0 0;
      text-align: center;
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .linkish {
      border: none;
      background: none;
      padding: 0;
      color: var(--primary);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      text-decoration: underline;
    }

    .recover-box {
      margin-top: 1.25rem;
      padding: 1rem;
      border: 1px solid color-mix(in srgb, var(--primary) 20%, #e2e8f0);
      border-radius: 12px;
      background: color-mix(in srgb, var(--primary-50, #eef2ff) 70%, #fff);
    }
    .recover-box h2 {
      margin: 0 0 0.35rem;
      font-size: 0.95rem;
      color: var(--primary-dark, #1e3a5f);
    }
    .recover-box p {
      margin: 0 0 0.85rem;
      font-size: 0.78rem;
      color: var(--text-muted);
      line-height: 1.4;
    }
    .recover-box code {
      font-size: 0.72rem;
      background: rgba(15, 23, 42, 0.06);
      padding: 0.1rem 0.3rem;
      border-radius: 4px;
    }
    .recover-form .field { margin-bottom: 0.65rem; }
    .submit-btn.secondary {
      margin-top: 0.25rem;
      background: #0f172a;
      box-shadow: none;
    }
    .alert.ok {
      background: color-mix(in srgb, #16a34a 12%, #fff);
      color: #166534;
    }
  `,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly showRecover = signal(false);
  readonly recoverLoading = signal(false);
  readonly recoverError = signal<string | null>(null);
  readonly recoverSuccess = signal<string | null>(null);

  readonly icons = {
    Eye: LucideEye,
    EyeOff: LucideEyeOff,
    LogIn: LucideLogIn,
    Mail: LucideMail,
    ShieldCheck: LucideShieldCheck,
    KeyRound: LucideKeyRound,
  };

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly recoverForm = this.fb.nonNullable.group({
    recoveryKey: ['', [Validators.required, Validators.minLength(16)]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();

    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(this.loginErrorMessage(err));
      },
    });
  }

  submitRecover(): void {
    if (this.recoverForm.invalid) return;
    this.recoverLoading.set(true);
    this.recoverError.set(null);
    this.recoverSuccess.set(null);
    const { recoveryKey, newPassword } = this.recoverForm.getRawValue();

    this.auth.recoverAdmin(recoveryKey, newPassword).subscribe({
      next: (res) => {
        this.recoverLoading.set(false);
        this.recoverSuccess.set(
          `${res.message}. Correo: ${res.email}. Ya puedes iniciar sesión.`,
        );
        this.recoverForm.reset();
        this.form.patchValue({ email: res.email, password: '' });
      },
      error: (err: unknown) => {
        this.recoverLoading.set(false);
        if (err instanceof HttpErrorResponse) {
          this.recoverError.set(
            err.error?.message ?? `No se pudo recuperar (${err.status || 'red'})`,
          );
          return;
        }
        this.recoverError.set('No se pudo recuperar el acceso de administrador');
      },
    });
  }

  private loginErrorMessage(err: unknown): string {
    if (!(err instanceof HttpErrorResponse)) {
      return 'No se pudo iniciar sesión. Intenta de nuevo.';
    }
    if (err.status === 0) {
      return 'No hay conexión con la API (http://localhost:3000). Abre la web en http://localhost:4200';
    }
    if (err.status === 401) {
      return 'Credenciales inválidas o usuario inactivo';
    }
    if (err.status === 400) {
      return 'Revisa el correo y la contraseña (mín. 6 caracteres, sin espacios al inicio/fin)';
    }
    return `Error al iniciar sesión (${err.status || 'red'})`;
  }
}
