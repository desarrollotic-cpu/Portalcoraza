import {
  Component,
  inject,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideMoon, LucideSun } from '@lucide/angular';
import { ThemeService } from '../../core/services/theme.service';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, Icon],
  template: `
    <div class="auth-outer-canvas">
      <!-- FORMAS AMBIENTALES DECORATIVAS DEL FONDO -->
      <div class="bg-shape-1"></div>
      <div class="bg-shape-2"></div>
      <div class="bg-shape-3"></div>

      <!-- CONTENEDOR PRINCIPAL FLOTANTE ESTILO TARJETA PREMIUM -->
      <main class="auth-main-container">
        <!-- LADO IZQUIERDO: HERO CORPORATIVO ELEGANTE (SIN VIDEO, MÁXIMA VELOCIDAD) -->
        <div class="auth-hero-side">
          <!-- CABECERA SUPERIOR IZQUIERDA -->
          <header class="hero-header">
            <div class="logo-badge">
              <img
                class="hero-logo-img"
                src="/brand/logo-coraza-cta.png"
                width="44"
                height="44"
                alt="Logo Coraza"
              />
            </div>
            <div class="brand-text-col">
              <span class="hero-brand-name">Portal Coraza</span>
              <span class="hero-brand-sub">Seguridad C.T.A.</span>
            </div>
          </header>

          <!-- CUERPO PRINCIPAL HERO -->
          <div class="hero-main-content">
            <div class="hero-shield-wrap">
              <img
                src="/brand/logo-coraza-cta.png"
                class="hero-large-logo"
                alt="Escudo Coraza"
              />
            </div>
            <h2 class="hero-headline">La Seguridad, un Compromiso de Todos</h2>
            <p class="hero-tagline">
              Plataforma integral de gestión operativa, talento humano, programación de turnos y seguridad privada.
            </p>

            <div class="hero-feature-pills">
              <div class="pill-item">
                <span>Operaciones & Turnos 24/7</span>
              </div>
              <div class="pill-item">
                <span>Gestión Humana & Certificados</span>
              </div>
              <div class="pill-item">
                <span>Minutas & Recepción Digital</span>
              </div>
            </div>
          </div>

          <!-- FOOTER INFERIOR IZQUIERDO -->
          <footer class="hero-footer">
            <p>© {{ year }} Coraza Seguridad C.T.A. · Vigilado SuperVigilancia Res. 6889</p>
          </footer>
        </div>

        <!-- LADO DERECHO: FORMULARIO DE ACCESO -->
        <div class="auth-form-side">
          <button
            type="button"
            class="theme-btn"
            (click)="theme.toggle()"
            [attr.aria-label]="theme.isDark() ? 'Activar modo claro' : 'Activar modo oscuro'"
            [title]="theme.isDark() ? 'Modo claro' : 'Modo oscuro'"
          >
            <app-icon
              [icon]="theme.isDark() ? sunIcon : moonIcon"
              [size]="18"
              [strokeWidth]="2"
            />
          </button>

          <div class="form-content-wrap">
            <router-outlet />
          </div>

          <div class="form-footer-links">
            <span>Seguridad y excelencia operativa</span>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: `
    .auth-outer-canvas {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f172a;
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
    }

    /* FORMAS ABSTRACTAS DECORATIVAS DEL FONDO */
    .bg-shape-1 {
      position: absolute;
      top: -8vw;
      right: -8vw;
      width: 48vw;
      height: 48vw;
      border-radius: 50%;
      background: linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%);
      opacity: 0.45;
      filter: blur(60px);
      pointer-events: none;
    }
    .bg-shape-2 {
      position: absolute;
      bottom: -12vw;
      left: -8vw;
      width: 52vw;
      height: 52vw;
      border-radius: 50%;
      background: linear-gradient(135deg, #1d4ed8 0%, #047857 100%);
      opacity: 0.35;
      filter: blur(70px);
      pointer-events: none;
    }
    .bg-shape-3 {
      position: absolute;
      bottom: 20%;
      right: 15%;
      width: 25vw;
      height: 25vw;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%);
      filter: blur(60px);
      pointer-events: none;
    }

    /* CONTENEDOR TIPO TARJETA GIGANTE CENTRADA */
    .auth-main-container {
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 1060px;
      min-height: 580px;
      display: grid;
      grid-template-columns: 1.15fr 0.95fr;
      border-radius: 2rem;
      overflow: hidden;
      box-shadow: 0 30px 70px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1);
      background: var(--bg-surface, #ffffff);
    }

    /* LADO IZQUIERDO: HERO CORPORATIVO */
    .auth-hero-side {
      position: relative;
      padding: 2.5rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      color: #ffffff;
      background: linear-gradient(145deg, #0c4a6e 0%, #0369a1 50%, #0f172a 100%);
      overflow: hidden;
    }

    .hero-header {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      z-index: 5;
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      padding: 0.45rem 1rem;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      width: fit-content;
    }
    .logo-badge {
      background: #ffffff;
      border-radius: 50%;
      padding: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
    }
    .hero-logo-img {
      border-radius: 50%;
      display: block;
    }
    .brand-text-col {
      display: flex;
      flex-direction: column;
    }
    .hero-brand-name {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #ffffff;
      line-height: 1.15;
    }
    .hero-brand-sub {
      font-size: 0.75rem;
      font-weight: 700;
      color: #93c5fd;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    /* CUERPO PRINCIPAL DEL HERO */
    .hero-main-content {
      margin: auto 0;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      z-index: 2;
    }
    .hero-shield-wrap {
      display: flex;
      margin-bottom: 0.25rem;
    }
    .hero-large-logo {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      background: #ffffff;
      padding: 3px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    }
    .hero-headline {
      font-size: 1.65rem;
      font-weight: 900;
      line-height: 1.25;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .hero-tagline {
      font-size: 0.92rem;
      color: #cbd5e1;
      line-height: 1.5;
      margin: 0;
      max-width: 440px;
    }

    .hero-feature-pills {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      margin-top: 0.75rem;
    }
    .pill-item {
      display: inline-flex;
      align-items: center;
      gap: 0.65rem;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 0.65rem;
      padding: 0.5rem 0.85rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: #f1f5f9;
      width: fit-content;
    }
    .pill-icon {
      font-size: 1rem;
    }

    .hero-footer {
      z-index: 5;
    }
    .hero-footer p {
      margin: 0;
      font-size: 0.75rem;
      color: #94a3b8;
      font-weight: 500;
    }

    /* LADO DERECHO: FORMULARIO */
    .auth-form-side {
      position: relative;
      padding: 2.5rem 3rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: var(--bg-surface, #ffffff);
    }

    .theme-btn {
      position: absolute;
      top: 1.5rem;
      right: 1.5rem;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: 1px solid var(--border-color, #e2e8f0);
      background: var(--bg-card, #ffffff);
      color: var(--text-muted, #64748b);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .theme-btn:hover {
      background: var(--bg-hover, #f1f5f9);
      color: var(--text-primary, #0f172a);
    }

    .form-content-wrap {
      margin: auto 0;
      width: 100%;
    }

    .form-footer-links {
      text-align: center;
      font-size: 0.8rem;
      color: var(--text-muted, #94a3b8);
      margin-top: 1.5rem;
    }

    @media (max-width: 900px) {
      .auth-main-container {
        grid-template-columns: 1fr;
      }
      .auth-hero-side {
        min-height: 240px;
        padding: 1.75rem;
      }
      .hero-feature-pills {
        display: none;
      }
      .auth-form-side {
        padding: 2rem 1.5rem;
      }
    }
  `,
})
export class AuthLayout {
  readonly theme = inject(ThemeService);
  readonly year = new Date().getFullYear();
  readonly sunIcon = LucideSun;
  readonly moonIcon = LucideMoon;
}

