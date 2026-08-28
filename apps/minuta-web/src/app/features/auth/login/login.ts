import { HttpErrorResponse } from '@angular/common/http';
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
    <div class="wrap">
      <form class="card" [formGroup]="form" (ngSubmit)="submit()">
        <img
          class="logo"
          src="/brand/logo-coraza-cta.png"
          width="72"
          height="72"
          alt="Coraza"
        />
        <h1>Minuta Virtual</h1>
        <p class="sub">Bitácora del puesto — acceso para vigilantes</p>
        @if (error()) {
          <p class="err" role="alert">{{ error() }}</p>
        }
        <label>
          Correo
          <input type="email" formControlName="email" autocomplete="username" />
        </label>
        <label>
          Contraseña
          <input type="password" formControlName="password" autocomplete="current-password" />
        </label>
        <button type="submit" [disabled]="loading() || form.invalid">
          {{ loading() ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
    </div>
  `,
  styles: `
    .wrap {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 1rem;
    }
    .card {
      width: min(100%, 380px);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 1.25rem;
      box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
    }
    .logo {
      margin: 0 auto;
      border-radius: 12px;
    }
    h1 {
      margin: 0;
      text-align: center;
      color: var(--primary-800);
      font-size: 1.35rem;
    }
    .sub {
      margin: 0;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.9rem;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
    }
    input {
      font: inherit;
      padding: 0.6rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    button {
      margin-top: 0.25rem;
      border: 0;
      border-radius: 10px;
      padding: 0.75rem;
      background: var(--primary-800);
      color: #fff;
      font-weight: 700;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .err {
      margin: 0;
      padding: 0.5rem 0.65rem;
      border-radius: 8px;
      background: #fee2e2;
      color: #991b1b;
      font-size: 0.88rem;
    }
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: (res) => {
        if (!res.user.permissions.includes('minuta.view')) {
          this.loading.set(false);
          this.error.set('Esta cuenta no tiene acceso a Minuta Virtual');
          return;
        }
        void this.router.navigateByUrl('/');
      },
      error: (err: unknown) => {
        this.loading.set(false);
        if (err instanceof Error && err.message.includes('Minuta')) {
          this.error.set(err.message);
          return;
        }
        const http = err as HttpErrorResponse;
        this.error.set(
          http.error?.message || 'No se pudo iniciar sesión. Verifica tus datos.',
        );
      },
      complete: () => this.loading.set(false),
    });
  }
}
