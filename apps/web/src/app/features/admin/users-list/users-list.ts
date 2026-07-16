import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import {
  AdminApiService,
  AdminRole,
  AdminUser,
  CreateUserPayload,
  UpdateUserPayload,
} from '../admin-api.service';

@Component({
  selector: 'app-users-list',
  imports: [FormsModule, DatePipe],
  template: `
    <section>
      @if (auth.hasPermission('users.create') && !editing()) {
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
            <button type="submit" class="btn btn-primary" [disabled]="submitting()">Crear usuario</button>
          </form>
          @if (formError()) {
            <p class="error">{{ formError() }}</p>
          }
          @if (formSuccess()) {
            <p class="success">{{ formSuccess() }}</p>
          }
        </div>
      }

      @if (editing(); as edit) {
        <div class="panel">
          <h3>Editar usuario</h3>
          <form class="create-form" (ngSubmit)="submitEdit()">
            <label>
              Correo *
              <input type="email" [(ngModel)]="editForm.email" name="editEmail" required />
            </label>
            <label>
              Nueva contraseña (opcional al editar datos)
              <input
                type="password"
                [(ngModel)]="editForm.password"
                name="editPassword"
                minlength="8"
                placeholder="Preferible usar «Restablecer» si olvidó la clave"
              />
            </label>
            <label>
              Nombre completo
              <input [(ngModel)]="editForm.fullName" name="editFullName" />
            </label>
            <label>
              Rol *
              <select [(ngModel)]="editForm.roleId" name="editRoleId" required>
                @for (r of roles(); track r.id) {
                  <option [value]="r.id">{{ r.name }}</option>
                }
              </select>
            </label>
            <label class="checkbox-field">
              <span>Estado</span>
              <span class="check-row">
                <input type="checkbox" [(ngModel)]="editForm.isActive" name="editActive" />
                Activo
              </span>
            </label>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" [disabled]="submitting()">Guardar</button>
              <button type="button" class="btn btn-ghost" (click)="cancelEdit()" [disabled]="submitting()">
                Cancelar
              </button>
            </div>
          </form>
          @if (formError()) {
            <p class="error">{{ formError() }}</p>
          }
          @if (formSuccess()) {
            <p class="success">{{ formSuccess() }}</p>
          }
        </div>
      }

      @if (resetting(); as resetUser) {
        <div class="panel">
          <h3>Restablecer contraseña</h3>
          <p class="hint">
            Solo para cuando el usuario <strong>{{ resetUser.email }}</strong> no recuerda su
            contraseña. Si la recuerda, puede cambiarla él mismo desde su menú de sesión.
          </p>
          <form class="create-form" (ngSubmit)="submitReset()">
            <label>
              Nueva contraseña
              <input
                type="password"
                [(ngModel)]="resetPassword"
                name="resetPassword"
                required
                minlength="8"
                autocomplete="new-password"
              />
            </label>
            <label>
              Confirmar
              <input
                type="password"
                [(ngModel)]="resetConfirm"
                name="resetConfirm"
                required
                minlength="8"
                autocomplete="new-password"
              />
            </label>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" [disabled]="submitting()">
                Restablecer
              </button>
              <button type="button" class="btn btn-ghost" (click)="cancelReset()" [disabled]="submitting()">
                Cancelar
              </button>
            </div>
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
              @if (canManage()) {
                <th>Acciones</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (u of users(); track u.id) {
              <tr [class.inactive-row]="!u.isActive">
                <td>{{ u.email }}</td>
                <td>{{ u.fullName ?? '—' }}</td>
                <td>{{ u.role?.name ?? '—' }}</td>
                <td>{{ u.isActive ? 'Activo' : 'Inactivo' }}</td>
                <td>{{ u.lastLoginAt ? (u.lastLoginAt | date: 'short') : '—' }}</td>
                @if (canManage()) {
                  <td class="actions">
                    <button type="button" class="btn btn-sm btn-outline" (click)="startEdit(u)">
                      Editar
                    </button>
                    <button type="button" class="btn btn-sm btn-outline" (click)="startReset(u)">
                      Restablecer clave
                    </button>
                    @if (u.isActive && u.id !== currentUserId()) {
                      <button type="button" class="btn btn-sm btn-danger" (click)="deactivate(u)">
                        Eliminar
                      </button>
                    }
                    @if (!u.isActive) {
                      <button type="button" class="btn btn-sm btn-success" (click)="reactivate(u)">
                        Reactivar
                      </button>
                    }
                  </td>
                }
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="canManage() ? 6 : 5">No hay usuarios.</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: `
    .panel {
      margin-bottom: 1.5rem;
      padding: 1.1rem 1.2rem;
      background: var(--coraza-surface);
      border: 1px solid var(--coraza-border);
      border-radius: 10px;
    }
    .panel h3 { margin: 0 0 0.85rem; font-size: 1rem; color: var(--primary-dark); }
    .hint { margin: 0 0 0.85rem; font-size: 0.88rem; color: var(--coraza-text-muted, #64748b); }
    .create-form {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.75rem;
      align-items: end;
    }
    label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; color: var(--coraza-text-muted, #64748b); }
    .checkbox-field .check-row { display: flex; align-items: center; gap: 0.4rem; min-height: 2.1rem; color: var(--primary-dark); }
    input, select {
      padding: 0.5rem 0.7rem;
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      font: inherit;
      background: #fff;
    }
    input:focus, select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      padding: 0.5rem 0.95rem;
      border-radius: 8px;
      border: 1px solid transparent;
      font: inherit;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition:
        background 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease,
        box-shadow 0.15s ease,
        transform 0.12s ease;
    }
    .btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
    .btn:not(:disabled):hover { transform: translateY(-1px); }
    .btn:not(:disabled):active { transform: translateY(0); }

    .btn-primary {
      background: var(--primary);
      border-color: var(--primary);
      color: #fff;
      box-shadow: 0 6px 14px color-mix(in srgb, var(--primary) 28%, transparent);
    }
    .btn-primary:not(:disabled):hover {
      filter: brightness(1.05);
      box-shadow: 0 8px 18px color-mix(in srgb, var(--primary) 34%, transparent);
    }

    .btn-ghost {
      background: #fff;
      border-color: var(--coraza-border);
      color: var(--primary-dark);
    }
    .btn-ghost:not(:disabled):hover {
      background: var(--primary-50);
      border-color: color-mix(in srgb, var(--primary) 35%, var(--coraza-border));
    }

    .btn-sm {
      padding: 0.32rem 0.7rem;
      font-size: 0.8rem;
      border-radius: 999px;
      font-weight: 600;
    }

    .btn-outline {
      background: color-mix(in srgb, var(--primary) 8%, #fff);
      border-color: color-mix(in srgb, var(--primary) 30%, var(--coraza-border));
      color: var(--primary-dark, var(--primary));
    }
    .btn-outline:not(:disabled):hover {
      background: color-mix(in srgb, var(--primary) 16%, #fff);
      border-color: var(--primary);
    }

    .btn-danger {
      background: color-mix(in srgb, var(--coraza-error, #dc2626) 10%, #fff);
      border-color: color-mix(in srgb, var(--coraza-error, #dc2626) 35%, #fecaca);
      color: var(--coraza-error, #b91c1c);
    }
    .btn-danger:not(:disabled):hover {
      background: color-mix(in srgb, var(--coraza-error, #dc2626) 18%, #fff);
      border-color: var(--coraza-error, #dc2626);
    }

    .btn-success {
      background: color-mix(in srgb, #16a34a 10%, #fff);
      border-color: color-mix(in srgb, #16a34a 35%, #bbf7d0);
      color: #15803d;
    }
    .btn-success:not(:disabled):hover {
      background: color-mix(in srgb, #16a34a 18%, #fff);
      border-color: #16a34a;
    }

    .form-actions { display: flex; gap: 0.55rem; align-items: end; flex-wrap: wrap; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--coraza-surface);
      border: 1px solid var(--coraza-border);
      border-radius: 10px;
      overflow: hidden;
    }
    th, td { padding: 0.7rem 0.85rem; border-bottom: 1px solid var(--coraza-border); text-align: left; vertical-align: middle; }
    th {
      background: var(--primary-50);
      font-size: 0.72rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--primary-dark);
    }
    .actions { display: flex; gap: 0.45rem; white-space: nowrap; flex-wrap: wrap; }
    .inactive-row { opacity: 0.7; background: color-mix(in srgb, #94a3b8 6%, transparent); }
    .error { color: var(--coraza-error); margin: 0.65rem 0 0; }
    .success { color: #1b7a3d; margin: 0.65rem 0 0; }
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
  readonly editing = signal<AdminUser | null>(null);
  readonly resetting = signal<AdminUser | null>(null);
  readonly currentUserId = signal<string | null>(null);

  create: CreateUserPayload = { email: '', password: '', fullName: '', roleId: '' };
  editForm: {
    email: string;
    password: string;
    fullName: string;
    roleId: string;
    isActive: boolean;
  } = { email: '', password: '', fullName: '', roleId: '', isActive: true };
  resetPassword = '';
  resetConfirm = '';

  ngOnInit(): void {
    this.currentUserId.set(this.auth.currentUser()?.id ?? null);
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

  canManage(): boolean {
    return this.auth.hasPermission('users.edit');
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
      error: (err) => {
        this.submitting.set(false);
        this.formError.set(err?.error?.message ?? 'No se pudo crear el usuario');
      },
    });
  }

  startEdit(user: AdminUser): void {
    this.resetting.set(null);
    this.editing.set(user);
    this.editForm = {
      email: user.email,
      password: '',
      fullName: user.fullName ?? '',
      roleId: user.role.id,
      isActive: user.isActive,
    };
    this.formError.set(null);
    this.formSuccess.set(null);
  }

  cancelEdit(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.formSuccess.set(null);
  }

  startReset(user: AdminUser): void {
    this.editing.set(null);
    this.resetting.set(user);
    this.resetPassword = '';
    this.resetConfirm = '';
    this.formError.set(null);
    this.formSuccess.set(null);
  }

  cancelReset(): void {
    this.resetting.set(null);
    this.resetPassword = '';
    this.resetConfirm = '';
    this.formError.set(null);
    this.formSuccess.set(null);
  }

  submitReset(): void {
    const target = this.resetting();
    if (!target) return;
    if (this.resetPassword.trim().length < 8) {
      this.formError.set('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (this.resetPassword !== this.resetConfirm) {
      this.formError.set('La confirmación no coincide');
      return;
    }

    this.submitting.set(true);
    this.formError.set(null);
    this.formSuccess.set(null);
    this.api.resetUserPassword(target.id, this.resetPassword.trim()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.formSuccess.set(`Contraseña restablecida para ${target.email}`);
        this.resetting.set(null);
        this.resetPassword = '';
        this.resetConfirm = '';
      },
      error: (err) => {
        this.submitting.set(false);
        this.formError.set(err?.error?.message ?? 'No se pudo restablecer la contraseña');
      },
    });
  }

  submitEdit(): void {
    const target = this.editing();
    if (!target || !this.editForm.email || !this.editForm.roleId) return;

    this.submitting.set(true);
    this.formError.set(null);
    this.formSuccess.set(null);

    const payload: UpdateUserPayload = {
      email: this.editForm.email.trim(),
      fullName: this.editForm.fullName.trim() || null,
      roleId: this.editForm.roleId,
      isActive: this.editForm.isActive,
    };
    if (this.editForm.password.trim()) {
      payload.password = this.editForm.password.trim();
    }

    this.api.updateUser(target.id, payload).subscribe({
      next: (updated) => {
        this.users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
        this.formSuccess.set('Usuario actualizado');
        this.submitting.set(false);
        this.editing.set(null);
      },
      error: (err) => {
        this.submitting.set(false);
        this.formError.set(err?.error?.message ?? 'No se pudo actualizar el usuario');
      },
    });
  }

  deactivate(user: AdminUser): void {
    const ok = window.confirm(
      `¿Desactivar a ${user.email}? Quedará inactivo y no podrá iniciar sesión.`,
    );
    if (!ok) return;

    this.api.deactivateUser(user.id).subscribe({
      next: (updated) => {
        this.users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
        if (this.editing()?.id === updated.id) {
          this.cancelEdit();
        }
      },
      error: (err) => {
        window.alert(err?.error?.message ?? 'No se pudo eliminar el usuario');
      },
    });
  }

  reactivate(user: AdminUser): void {
    this.api.updateUser(user.id, { isActive: true }).subscribe({
      next: (updated) => {
        this.users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
      },
      error: (err) => {
        window.alert(err?.error?.message ?? 'No se pudo reactivar el usuario');
      },
    });
  }
}
