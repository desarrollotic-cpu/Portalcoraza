import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideShieldCheck } from '@lucide/angular';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, Icon],
  template: `
    <div class="auth-shell">
      <aside class="auth-brand" aria-hidden="true">
        <div class="brand-mesh"></div>
        <div class="brand-orbs">
          <span class="orb orb-1"></span>
          <span class="orb orb-2"></span>
          <span class="orb orb-3"></span>
        </div>

        <div class="brand-content">
          <div class="brand-logo">
            <div class="logo-mark">
              <app-icon [icon]="shieldIcon" [size]="26" [strokeWidth]="2.2" />
            </div>
            <span class="brand-text">Portal Coraza</span>
          </div>

          <div class="brand-copy">
            <h2>Portal operativo <br />para tu equipo de seguridad.</h2>
            <p>
              Recursos Humanos, dotación, programación y unidades residenciales
              en una sola plataforma integrada.
            </p>
          </div>

          <ul class="brand-highlights">
            <li>
              <span class="dot"></span>
              Gestión centralizada del personal
            </li>
            <li>
              <span class="dot"></span>
              Control de dotación con firma digital
            </li>
            <li>
              <span class="dot"></span>
              Programación mensual por puesto
            </li>
          </ul>
        </div>
      </aside>

      <section class="auth-left">
        <div class="auth-card">
          <router-outlet />
        </div>
        <footer class="auth-footer">
          <span>© {{ year }} Portal Coraza</span>
          <span class="dot-sep">•</span>
          <span>Seguridad y talento humano</span>
        </footer>
      </section>
    </div>
  `,
  styles: `
    .auth-shell {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1.05fr minmax(420px, 0.95fr);
      background: var(--bg-page);
    }

    .auth-brand {
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: var(--text-on-primary);
      background: var(--gradient-hero-mesh);
    }

    .brand-mesh {
      position: absolute;
      inset: 0;
      background: var(--gradient-hero-mesh);
      opacity: 1;
    }

    .brand-orbs {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(60px);
      opacity: 0.6;
    }
    .orb-1 {
      width: 380px;
      height: 380px;
      background: radial-gradient(circle, #a855f7 0%, transparent 70%);
      top: -80px;
      left: -80px;
    }
    .orb-2 {
      width: 320px;
      height: 320px;
      background: radial-gradient(circle, #22d3ee 0%, transparent 70%);
      bottom: -60px;
      right: -60px;
      opacity: 0.5;
    }
    .orb-3 {
      width: 260px;
      height: 260px;
      background: radial-gradient(circle, #ec4899 0%, transparent 70%);
      top: 40%;
      left: 30%;
      opacity: 0.35;
    }

    .brand-content {
      position: relative;
      z-index: 1;
      max-width: 520px;
      display: flex;
      flex-direction: column;
      gap: 2.5rem;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .logo-mark {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.14);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.22);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.28);
    }

    .brand-text {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.8rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #fff 0%, #ddd6fe 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .brand-copy h2 {
      font-family: var(--font-display);
      font-size: clamp(1.75rem, 3vw, 2.5rem);
      font-weight: 700;
      line-height: 1.15;
      margin: 0 0 1rem;
      color: #fff;
      letter-spacing: -0.02em;
    }
    .brand-copy p {
      margin: 0;
      font-size: 1rem;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.78);
      max-width: 460px;
    }

    .brand-highlights {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .brand-highlights li {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      color: rgba(255, 255, 255, 0.9);
      font-size: 0.95rem;
    }
    .brand-highlights .dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: linear-gradient(135deg, #22d3ee, #a855f7);
      box-shadow: 0 0 12px rgba(168, 85, 247, 0.6);
    }

    .auth-left {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 2.5rem;
      background: var(--bg-page);
      background-image: var(--gradient-page);
      background-attachment: fixed;
      position: relative;
      gap: 1.5rem;
    }

    .auth-card {
      width: 100%;
      max-width: 440px;
      padding: 3rem 2.5rem;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.7);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-xl);
    }

    .auth-footer {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .dot-sep {
      color: var(--neutral-300);
    }

    @media (max-width: 1024px) {
      .auth-shell {
        grid-template-columns: 1fr;
      }
      .auth-brand {
        display: none;
      }
      .auth-left {
        padding: 2rem 1.25rem;
      }
      .auth-card {
        padding: 2.25rem 1.75rem;
      }
    }
  `,
})
export class AuthLayout {
  readonly year = new Date().getFullYear();
  readonly shieldIcon = LucideShieldCheck;
}
