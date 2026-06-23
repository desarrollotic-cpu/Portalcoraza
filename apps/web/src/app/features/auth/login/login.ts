import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
    <form class="login-form" [formGroup]="form" (ngSubmit)="submit()">
      <div class="brand-row">
        <img
          class="form-logo"
          src="/images/coraza-logo.png"
          alt="Coraza"
          (error)="hideLogo($event)"
        />
        @if (!logoVisible()) {
          <span class="form-brand">Coraza</span>
        }
      </div>

      <h1>¡Hola! Bienvenido</h1>
      <p class="subtitle">Inicia sesión con tu cuenta.</p>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <div class="field">
        <label for="email">Correo <span class="req">*</span></label>
        <input
          id="email"
          class="underline-input"
          type="email"
          formControlName="email"
          autocomplete="username"
        />
      </div>

      <div class="field">
        <label for="password">Contraseña <span class="req">*</span></label>
        <div class="password-wrap">
          <input
            id="password"
            class="underline-input"
            [type]="showPassword() ? 'text' : 'password'"
            formControlName="password"
            autocomplete="current-password"
          />
          <button
            type="button"
            class="toggle-pw"
            (click)="showPassword.set(!showPassword())"
            [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          >
            @if (showPassword()) {
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 6c3.79 0 7.17 2.13 8.82 5.5-.64 1.29-1.51 2.45-2.54 3.41L19 12.41C20.21 11.46 21.12 10.19 21.71 8.75 19.87 5.19 16.19 3 12 3c-1.19 0-2.34.16-3.43.46l1.46 1.46C10.74 4.55 11.35 4.5 12 4.5c3.04 0 5.78 1.69 7.16 4.41L12 17.5 4.84 10.34C6.22 7.69 8.96 6 12 6zm-1.07 11.11L3.71 9.89 2.29 11.31l2.89 2.89C6.14 16.05 8.89 17 12 17c3.87 0 7.26-2.07 9.11-5.18l-2.01-2.01C17.74 11.53 15.01 13 12 13c-.69 0-1.35-.1-1.97-.28l2.9-2.9z"
                />
              </svg>
            } @else {
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                />
              </svg>
            }
          </button>
        </div>
      </div>

      <button
        type="submit"
        class="submit-btn"
        [class.ready]="form.valid && !loading()"
        [disabled]="form.invalid || loading()"
      >
        {{ loading() ? 'Ingresando...' : 'Ingresar' }}
      </button>
    </form>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    .login-form {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0;
      text-align: left;
    }

    .brand-row {
      margin-bottom: 2.5rem;
      min-height: 40px;
      display: flex;
      align-items: center;
    }

    .form-logo {
      height: 36px;
      width: auto;
      max-width: 160px;
      object-fit: contain;
    }

    .form-brand {
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--primary-dark);
      letter-spacing: 0.02em;
    }

    h1 {
      margin: 0 0 0.5rem;
      font-size: 2rem;
      font-weight: 700;
      color: var(--neutral-900);
      line-height: 1.2;
    }

    .subtitle {
      margin: 0 0 2.25rem;
      color: var(--text-secondary);
      font-size: 1rem;
      line-height: 1.5;
    }

    .field {
      margin-bottom: 1.75rem;
    }

    label {
      display: block;
      font-size: 0.95rem;
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: 0.35rem;
    }

    .req {
      color: var(--text-secondary);
    }

    .underline-input {
      width: 100%;
      border: none;
      border-bottom: 1px solid var(--neutral-300);
      border-radius: 0;
      padding: 0.65rem 0 0.55rem;
      font-size: 1.05rem;
      background: transparent;
      color: var(--text-primary);
      transition: border-color 0.15s ease;
    }

    .underline-input:focus {
      outline: none;
      border-bottom-color: var(--primary-main);
      border-bottom-width: 2px;
      padding-bottom: calc(0.55rem - 1px);
    }

    .password-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .password-wrap .underline-input {
      padding-right: 2.5rem;
    }

    .toggle-pw {
      position: absolute;
      right: 0;
      bottom: 0.45rem;
      border: none;
      background: transparent;
      padding: 0.25rem;
      cursor: pointer;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .toggle-pw svg {
      width: 22px;
      height: 22px;
      fill: currentColor;
    }

    .toggle-pw:hover {
      color: var(--primary-main);
    }

    .submit-btn {
      width: 100%;
      margin-top: 0.5rem;
      padding: 0.95rem 1.5rem;
      border: none;
      border-radius: 999px;
      font-size: 1.05rem;
      font-weight: 600;
      cursor: not-allowed;
      background: var(--neutral-300);
      color: var(--text-on-primary);
      transition: background 0.2s ease, transform 0.15s ease;
    }

    .submit-btn.ready {
      cursor: pointer;
      background: var(--coraza-primary);
    }

    .submit-btn.ready:hover {
      background: var(--coraza-primary-hover);
    }

    .submit-btn:disabled {
      opacity: 1;
    }

    .error {
      color: var(--coraza-error);
      margin: -1rem 0 1.25rem;
      font-size: 0.9rem;
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
  readonly logoVisible = signal(true);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  hideLogo(event: Event): void {
    this.logoVisible.set(false);
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

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
      error: () => {
        this.loading.set(false);
        this.error.set('Credenciales inválidas o usuario inactivo');
      },
    });
  }
}
