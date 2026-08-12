import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-vigia-portal',
  imports: [RouterLink],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Coraza Vigía</h2>
          <p>
            Módulo de vigilancia en puesto: turnero, consignas, SOS, dotación y colillas. La app de
            campo la usan los vigilantes con cédula y primer nombre.
          </p>
        </div>
        <a class="btn" routerLink="/vigia/login" target="_blank" rel="noopener">Abrir app vigilante</a>
      </header>

      <div class="grid">
        <article class="card">
          <h3>App de campo</h3>
          <p>Acceso móvil para asociados activos. Login: cédula + primer nombre (sin clave admin).</p>
          <a class="link" routerLink="/vigia/login">/vigia/login</a>
        </article>
        <article class="card">
          <h3>Qué registra el vigilante</h3>
          <ul>
            <li>Inicio y cierre de turno (relevo)</li>
            <li>SOS / alerta de vida</li>
            <li>Consignas del puesto</li>
            <li>Dotación y firmas</li>
            <li>Colillas y reclamos</li>
          </ul>
        </article>
        <article class="card">
          <h3>Próximo (oficina)</h3>
          <p>
            Panel ops: consignas por puesto, SOS en vivo, colillas y bitácora — mismo ecosistema
            Portal, con permisos de Gerencia / Operaciones.
          </p>
        </article>
      </div>
    </section>
  `,
  styles: `
    .page {
      display: grid;
      gap: 1.25rem;
    }
    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }
    .head h2 {
      margin: 0 0 0.35rem;
      font-size: 1.35rem;
    }
    .head p {
      margin: 0;
      max-width: 42rem;
      color: var(--muted, #64748b);
      line-height: 1.45;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      padding: 0.65rem 1rem;
      border-radius: 0.55rem;
      background: #0f2744;
      color: #fff;
      text-decoration: none;
      font-weight: 600;
      white-space: nowrap;
    }
    .btn:hover {
      filter: brightness(1.08);
    }
    .grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }
    .card {
      background: var(--surface, #fff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 0.75rem;
      padding: 1rem 1.1rem;
    }
    .card h3 {
      margin: 0 0 0.5rem;
      font-size: 1rem;
    }
    .card p,
    .card li {
      margin: 0;
      color: var(--muted, #64748b);
      font-size: 0.92rem;
      line-height: 1.45;
    }
    .card ul {
      margin: 0;
      padding-left: 1.1rem;
      display: grid;
      gap: 0.25rem;
    }
    .link {
      display: inline-block;
      margin-top: 0.75rem;
      color: #0f2744;
      font-weight: 600;
    }
  `,
})
export class VigiaPortal {}
