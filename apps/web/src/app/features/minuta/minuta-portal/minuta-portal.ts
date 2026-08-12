import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-minuta-portal',
  imports: [RouterLink],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Minuta Virtual</h2>
          <p>
            Bitácora de puesto: visitantes, correspondencia, contratistas, domiciliarios, incidentes,
            servicio y entrega de turno. La app de campo usa la misma sesión Vigía (cédula + PIN).
          </p>
        </div>
        <a class="btn" routerLink="/minuta" target="_blank" rel="noopener">Abrir Minuta (campo)</a>
      </header>
      <div class="grid">
        <article class="card">
          <h3>Acceso vigilante</h3>
          <p>Primero inicia sesión en Vigía; luego abre Minuta con la misma sesión.</p>
          <a class="link" routerLink="/vigia/login">/vigia/login</a>
        </article>
        <article class="card">
          <h3>Módulos MVP</h3>
          <ul>
            <li>Visitantes / Contratistas / Domiciliarios (entrada-salida)</li>
            <li>Correspondencia (pendiente → entregado)</li>
            <li>Incidentes + prioridad por gravedad</li>
            <li>Servicio y entrega de puesto</li>
            <li>Dashboard con eficiencia del día</li>
          </ul>
        </article>
      </div>
    </section>
  `,
  styles: `
    .page { display:grid; gap:1.25rem; }
    .head { display:flex; flex-wrap:wrap; justify-content:space-between; gap:1rem; }
    .head h2 { margin:0 0 .35rem; }
    .head p { margin:0; max-width:42rem; color:#64748b; }
    .btn { display:inline-flex; align-items:center; padding:.65rem 1rem; border-radius:.55rem; background:#1E3A8A; color:#fff; text-decoration:none; font-weight:700; }
    .grid { display:grid; gap:1rem; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); }
    .card { background:#fff; border:1px solid #e2e8f0; border-radius:.75rem; padding:1rem; }
    .card h3 { margin:0 0 .5rem; }
    .card p, .card li { color:#64748b; font-size:.92rem; }
    .link { color:#1E3A8A; font-weight:700; }
  `,
})
export class MinutaPortal {}
