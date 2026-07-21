import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-post-equipment-tabs',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="tabs" aria-label="Elementos de puesto">
      <a
        routerLink="/dotacion/elementos"
        routerLinkActive="active"
        [routerLinkActiveOptions]="{ exact: true }"
      >
        Inventario de elementos
      </a>
      <a routerLink="/dotacion/elementos/puestos" routerLinkActive="active">
        Entregar a puestos
      </a>
    </nav>
  `,
  styles: `
    .tabs {
      display: flex;
      gap: 0.35rem;
      margin-bottom: 1.25rem;
      padding: 0.25rem;
      border-radius: 10px;
      background: #f1f5f9;
      width: fit-content;
      max-width: 100%;
      flex-wrap: wrap;
    }
    .tabs a {
      padding: 0.5rem 0.95rem;
      border-radius: 8px;
      text-decoration: none;
      font-size: 0.88rem;
      font-weight: 600;
      color: #475569;
    }
    .tabs a.active {
      background: #fff;
      color: var(--primary-dark);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    }
  `,
})
export class PostEquipmentTabs {}
