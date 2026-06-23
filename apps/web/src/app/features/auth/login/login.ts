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
    <form class="card" [formGroup]="form" (ngSubmit)="submit()">
      <h1>Iniciar sesión</h1>
      <p class="subtitle">Portal administrativo Coraza</p>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <label>
        Correo
        <input type="email" formControlName="email" autocomplete="username" />
      </label>

      <label>
        Contraseña
        <input
          type="password"
          formControlName="password"
          autocomplete="current-password"
        />
      </label>

      <button type="submit" [disabled]="form.invalid || loading()">
        {{ loading() ? 'Ingresando...' : 'Ingresar' }}
      </button>
    </form>
  `,
  styles: `
    .card {
      width: 100%;
      max-width: 360px;
      background: transparent;
      padding: 0;
      border: none;
      box-shadow: none;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--primary-dark);
    }
    .subtitle {
      margin: 0 0 0.5rem;
      color: var(--coraza-text-muted);
      font-size: 0.9rem;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.85rem;
      color: var(--coraza-text);
    }
    input {
      padding: 0.6rem 0.75rem;
      border: 1px solid var(--coraza-border);
      border-radius: var(--coraza-radius);
      font-size: 1rem;
      background: var(--primary-50);
    }
    button {
      margin-top: 0.5rem;
      padding: 0.7rem;
      background: var(--coraza-primary);
      color: #fff;
      border: none;
      border-radius: var(--coraza-radius);
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    button:hover:not(:disabled) {
      background: var(--coraza-primary-hover);
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .error {
      color: var(--coraza-error);
      margin: 0;
      font-size: 0.85rem;
    }
  `,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
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
      error: () => {
        this.loading.set(false);
        this.error.set('Credenciales inválidas o usuario inactivo');
      },
    });
  }
}
