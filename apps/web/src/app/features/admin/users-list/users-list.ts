import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AdminApiService, AdminRole, AdminUser, CreateUserPayload } from '../admin-api.service';

@Component({
  selector: 'app-users-list',
  imports: [RouterLink, RouterLinkActive, FormsModule, DatePipe],
  template: `
    <section>
      <header>
        <h2>Administración — Usuarios</h2>
        <p>Gestión de cuentas del sistema.</p>
        <nav class="subnav">
          <a routerLink="/admin/usuarios" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            Usuarios
          </a>
          @if (auth.hasPermission('roles.view')) {
            <a routerLink="/admin/roles" routerLinkActive="active">Roles y permisos</a>
          }
        </nav>
      </header>

      @if (auth.hasPermission('users.create')) {
        <div class="panel">
          <h3>Nuevo usuario</h3>
          <form class="create-form" (ngSubmit)="submitCreate()">
            <label>
              Correo *
              <input type="email" [(ngModel)]="create.email" name="email" required />
            </label>
            <label>
              Contraseña *
              <input type="password" [(ngModel)]="create.password" name="password" required minlength="8" />
            </label>
            <label>
              Nombre completo
              <input [(ngModel)]="create.fullName" name="fullName" />
            </label>
            <label>
              Rol *
              <select [(ngModel)]="create.roleId" name="roleId" required>
                <option value="">Seleccione...</option>
                @for (r of roles(); track r.id) {
                  <option [value]="r.id">{{ r.name }}</option>
                }
              </select>
            </label>
            <button type="submit" [disabled]="submitting()">Crear usuario</button>
          </form>
          @if (formError()) {
            <p class="error">{{ formError() }}</p>
          }
          @if (formSuccess()) {
            <p class="success">{{ formSuccess() }}</p>
          }
        </div>
      }

      @if (loading()) {
        <p>Cargando...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Correo</th>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Último acceso</th>
            </tr>
          </thead>
          <tbody>
            @for (u of users(); track u.id) {
              <tr>
                <td>{{ u.email }}</td>
                <td>{{ u.fullName ?? '—' }}</td>
                <td>{{ u.role.name }}</td>
                <td>{{ u.isActive ? 'Activo' : 'Inactivo' }}</td>
                <td>{{ u.lastLoginAt ? (u.lastLoginAt | date: 'short') : '—' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5">No hay usuarios.</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: `
    header h2 { margin: 0; color: var(--primary-dark); font-weight: 600; }
    header p { color: var(--coraza-text-muted); margin: 0.25rem 0 1rem; }
    .subnav { display: flex; gap: 0.75rem; margin-bottom: 1rem; }
    .subnav a {
      text-decoration: none;
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      border: 1px solid var(--coraza-border);
      color: var(--primary-dark);
      font-size: 0.85rem;
    }
    .subnav a.active { background: var(--primary-50); }
    .panel { margin-bottom: 1.5rem; padding: 1rem; background: var(--coraza-surface); border: 1px solid var(--coraza-border); border-radius: 8px; }
    .create-form { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; align-items: end; }
    label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; }
    input, select { padding: 0.45rem 0.6rem; border: 1px solid var(--coraza-border); border-radius: 8px; }
    button { padding: 0.45rem 0.85rem; border-radius: 8px; border: 1px solid var(--primary); background: var(--primary); color: #fff; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; background: var(--coraza-surface); border: 1px solid var(--coraza-border); border-radius: 8px; overflow: hidden; }
    th, td { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--coraza-border); text-align: left; }
    th { background: var(--primary-50); font-size: 0.75rem; text-transform: uppercase; }
    .error { color: var(--coraza-error); }
    .success { color: #1b7a3d; }
  `,
})
export class UsersList implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(AdminApiService);

  readonly users = signal<AdminUser[]>([]);
  readonly roles = signal<AdminRole[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly formSuccess = signal<string | null>(null);

  create: CreateUserPayload = { email: '', password: '', fullName: '', roleId: '' };

  ngOnInit(): void {
    forkJoin({
      users: this.api.listUsers(),
      roles: this.api.listRoles(),
    }).subscribe({
      next: ({ users, roles }) => {
        this.users.set(users);
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar los usuarios');
      },
    });
  }

  submitCreate(): void {
    if (!this.create.email || !this.create.password || !this.create.roleId) return;
    this.submitting.set(true);
    this.formError.set(null);
    this.formSuccess.set(null);

    const payload: CreateUserPayload = {
      email: this.create.email,
      password: this.create.password,
      roleId: this.create.roleId,
      fullName: this.create.fullName || undefined,
    };

    this.api.createUser(payload).subscribe({
      next: (user) => {
        this.users.update((list) => [user, ...list]);
        this.create = { email: '', password: '', fullName: '', roleId: '' };
        this.formSuccess.set('Usuario creado');
        this.submitting.set(false);
      },
      error: () => {
        this.submitting.set(false);
        this.formError.set('No se pudo crear el usuario');
      },
    });
  }
}
