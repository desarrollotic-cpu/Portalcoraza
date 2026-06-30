import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AdminApiService, AdminRole, Permission } from '../admin-api.service';

@Component({
  selector: 'app-roles-permissions',
  imports: [RouterLink, RouterLinkActive, FormsModule],
  template: `
    <section>
      <header>
        <h2>Administración — Roles y permisos</h2>
        <p>Asignación de permisos por rol operativo.</p>
        <nav class="subnav">
          @if (auth.hasPermission('users.view')) {
            <a routerLink="/admin/usuarios" routerLinkActive="active">Usuarios</a>
          }
          <a routerLink="/admin/roles" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            Roles y permisos
          </a>
        </nav>
      </header>

      @if (loading()) {
        <p>Cargando...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <div class="layout-grid">
          <aside>
            <h3>Roles</h3>
            <ul>
              @for (r of roles(); track r.id) {
                <li>
                  <button
                    type="button"
                    [class.active]="selectedRoleId() === r.id"
                    (click)="selectRole(r.id)"
                  >
                    {{ r.name }}
                    <small>{{ r.code }}</small>
                  </button>
                </li>
              }
            </ul>
          </aside>

          <div class="permissions-panel">
            @if (selectedRole(); as role) {
              <h3>{{ role.name }}</h3>
              <p class="muted">{{ role.description ?? 'Sin descripción' }}</p>

              @for (group of permissionGroups(); track group.module) {
                <div class="module-group">
                  <h4>{{ group.module }}</h4>
                  @for (p of group.permissions; track p.id) {
                    <label class="perm-row">
                      <input
                        type="checkbox"
                        [checked]="isSelected(p.id)"
                        [disabled]="!canManage()"
                        (change)="togglePermission(p.id, $event)"
                      />
                      <span>{{ p.name }} <code>{{ p.code }}</code></span>
                    </label>
                  }
                </div>
              }

              @if (canManage()) {
                <div class="actions">
                  <button type="button" (click)="save()" [disabled]="saving()">Guardar permisos</button>
                </div>
              }

              @if (formError()) {
                <p class="error">{{ formError() }}</p>
              }
              @if (formSuccess()) {
                <p class="success">{{ formSuccess() }}</p>
              }
            } @else {
              <p>Seleccione un rol.</p>
            }
          </div>
        </div>
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
    .layout-grid { display: grid; grid-template-columns: 240px 1fr; gap: 1rem; }
    aside ul { list-style: none; margin: 0; padding: 0; }
    aside button {
      width: 100%;
      text-align: left;
      padding: 0.6rem 0.75rem;
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      background: var(--coraza-surface);
      margin-bottom: 0.35rem;
      cursor: pointer;
    }
    aside button.active { border-color: var(--primary); background: var(--primary-50); }
    aside small { display: block; color: var(--coraza-text-muted); font-size: 0.75rem; }
    .permissions-panel {
      padding: 1rem;
      background: var(--coraza-surface);
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
    }
    .module-group { margin-bottom: 1rem; }
    .module-group h4 { margin: 0 0 0.5rem; font-size: 0.85rem; text-transform: uppercase; color: var(--primary-dark); }
    .perm-row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.35rem; font-size: 0.9rem; }
    code { font-size: 0.75rem; color: var(--coraza-text-muted); }
    .muted { color: var(--coraza-text-muted); font-size: 0.9rem; }
    .actions { margin-top: 1rem; }
    button[type="button"] {
      padding: 0.45rem 0.85rem;
      border-radius: 8px;
      border: 1px solid var(--primary);
      background: var(--primary);
      color: #fff;
      cursor: pointer;
    }
    .error { color: var(--coraza-error); }
    .success { color: #1b7a3d; }
  `,
})
export class RolesPermissions implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(AdminApiService);

  readonly roles = signal<AdminRole[]>([]);
  readonly permissions = signal<Permission[]>([]);
  readonly selectedRoleId = signal<string | null>(null);
  readonly selectedPermissionIds = signal<Set<string>>(new Set());
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly formSuccess = signal<string | null>(null);

  readonly selectedRole = computed(() =>
    this.roles().find((r) => r.id === this.selectedRoleId()) ?? null,
  );

  readonly permissionGroups = computed(() => {
    const byModule = new Map<string, Permission[]>();
    for (const p of this.permissions()) {
      const list = byModule.get(p.module) ?? [];
      list.push(p);
      byModule.set(p.module, list);
    }
    return [...byModule.entries()].map(([module, permissions]) => ({ module, permissions }));
  });

  readonly canManage = computed(() => this.auth.hasPermission('roles.manage'));

  ngOnInit(): void {
    forkJoin({
      roles: this.api.listRoles(),
      permissions: this.api.listPermissions(),
    }).subscribe({
      next: ({ roles, permissions }) => {
        this.roles.set(roles);
        this.permissions.set(permissions);
        if (roles.length > 0) {
          this.selectRole(roles[0].id);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar roles y permisos');
      },
    });
  }

  selectRole(roleId: string): void {
    this.selectedRoleId.set(roleId);
    const role = this.roles().find((r) => r.id === roleId);
    const ids = new Set(role?.rolePermissions.map((rp) => rp.permissionId) ?? []);
    this.selectedPermissionIds.set(ids);
    this.formError.set(null);
    this.formSuccess.set(null);
  }

  isSelected(permissionId: string): boolean {
    return this.selectedPermissionIds().has(permissionId);
  }

  togglePermission(permissionId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedPermissionIds.update((set) => {
      const next = new Set(set);
      if (checked) next.add(permissionId);
      else next.delete(permissionId);
      return next;
    });
  }

  save(): void {
    const roleId = this.selectedRoleId();
    if (!roleId) return;

    this.saving.set(true);
    this.formError.set(null);
    this.formSuccess.set(null);

    this.api.updateRolePermissions(roleId, [...this.selectedPermissionIds()]).subscribe({
      next: (updated) => {
        this.roles.update((list) => list.map((r) => (r.id === updated.id ? updated : r)));
        this.formSuccess.set('Permisos actualizados');
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.formError.set('No se pudieron guardar los permisos');
      },
    });
  }
}
