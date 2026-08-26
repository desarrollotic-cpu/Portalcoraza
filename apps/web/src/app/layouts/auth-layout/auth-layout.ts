import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideMoon, LucideSun } from '@lucide/angular';
import { ThemeService } from '../../core/services/theme.service';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, Icon],
  template: `
    <div class="auth-shell">
      <!-- PANEL IZQUIERDO: CÁPSULA GIGANTE DE CONTENCIÓN DE LA MASCOTA -->
      <aside class="auth-brand" aria-hidden="true">
        <!-- VIDEO GIGANTE EN BUCLE DE FONDO DE LA MASCOTA ATRAPADA -->
        <div class="containment-chamber">
          <video
            class="mascot-full-video"
            src="/videos/mascota-coraza.mp4"
            autoplay
            muted
            loop
            playsinline
            disablePictureInPicture
          ></video>
          
          <!-- EFECTO CRISTAL / CÁPSULA HOLOGRÁFICA DE CONTENCIÓN -->
          <div class="chamber-glass-overlay"></div>
          <div class="chamber-scanline"></div>
          <div class="chamber-grid"></div>

          <!-- PUNTOS LÁSER Y SELLO DE SEGURIDAD -->
          <div class="containment-hud top-hud">
            <span class="hud-tag">
              <span class="pulse-red"></span>
              CÁPSULA DE CONTENCIÓN · SEGURIDAD CORAZA
            </span>
            <span class="hud-code">SEC-SYS // 2027</span>
          </div>

          <div class="containment-hud bottom-hud">
            <span class="hud-tag">
              <span class="pulse-green"></span>
              ENTIDAD EN CUSTODIA · COCO GUARDIÁN
            </span>
            <span class="hud-code">ESTADO: EN MOVIMIENTO</span>
          </div>
        </div>

        <!-- CONTENIDO SUPERPUESTO CON CRISTAL TRANSLÚCIDO -->
        <div class="brand-content">
          <div class="glass-hero-card">
            <div class="brand-logo">
              <img
                class="logo-img"
                src="/brand/logo-coraza-cta.png"
                width="84"
                height="84"
                alt="Coraza Seguridad C.T.A."
              />
              <div class="brand-titles">
                <span class="brand-text">Portal Coraza</span>
                <span class="brand-sub">Coraza Seguridad C.T.A.</span>
              </div>
            </div>

            <div class="brand-copy">
              <h2>Portal operativo <br />para tu equipo de seguridad.</h2>
              <p>
                Recursos Humanos, dotación, programación, documental y recepción
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
        </div>
      </aside>

      <!-- PANEL DERECHO: FORMULARIO DE LOGIN -->
      <section class="auth-left">
        <div class="auth-card">
          <button
            type="button"
            class="auth-theme-toggle"
            (click)="theme.toggle()"
            [attr.aria-label]="theme.isDark() ? 'Activar modo claro' : 'Activar modo oscuro'"
            [title]="theme.isDark() ? 'Modo claro' : 'Modo oscuro'"
          >
            <app-icon
              [icon]="theme.isDark() ? sunIcon : moonIcon"
              [size]="18"
              [strokeWidth]="1.9"
            />
          </button>
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
      grid-template-columns: 1.1fr minmax(420px, 0.9fr);
      background: var(--bg-page);
    }

    /* CONTENCIÓN GIGANTE DE LA MASCOTA */
    .auth-brand {
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem 2rem;
      background: #090d16;
    }

    .containment-chamber {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      z-index: 0;
      background: radial-gradient(circle at center, #1e1b4b 0%, #030712 100%);
    }

    /* VIDEO A PANTALLA COMPLETA GIGANTE */
    .mascot-full-video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.9;
      transform: scale(1.05);
      filter: saturate(1.15) contrast(1.08) brightness(0.85);
    }

    /* EFECTO CRISTAL / REFLEJO DE CÁPSULA */
    .chamber-glass-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        135deg,
        rgba(37, 99, 235, 0.35) 0%,
        rgba(15, 23, 42, 0.45) 50%,
        rgba(147, 51, 234, 0.35) 100%
      );
      box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.8), inset 0 0 40px rgba(59, 130, 246, 0.3);
      pointer-events: none;
    }

    /* LÍNEA DE ESCANEO LÁSER */
    .chamber-scanline {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.8), transparent);
      box-shadow: 0 0 15px rgba(56, 189, 248, 0.9);
      animation: scanLaser 4s ease-in-out infinite alternate;
      pointer-events: none;
    }
    @keyframes scanLaser {
      0% { top: 2%; opacity: 0.3; }
      50% { opacity: 0.9; }
      100% { top: 98%; opacity: 0.3; }
    }

    /* CUADRÍCULA HOLOGRÁFICA */
    .chamber-grid {
      position: absolute;
      inset: 0;
      background-image: linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
      background-size: 32px 32px;
      pointer-events: none;
      opacity: 0.6;
    }

    /* HUD DE CONTENCIÓN */
    .containment-hud {
      position: absolute;
      left: 1.5rem;
      right: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 2;
      pointer-events: none;
      font-family: monospace;
    }
    .top-hud { top: 1.25rem; }
    .bottom-hud { bottom: 1.25rem; }

    .hud-tag {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(8px);
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #e2e8f0;
      text-transform: uppercase;
    }
    .hud-code {
      font-size: 0.72rem;
      color: rgba(255, 255, 255, 0.6);
      font-weight: 700;
      letter-spacing: 0.1em;
    }

    .pulse-red {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #ef4444;
      box-shadow: 0 0 8px #ef4444;
      animation: blinkRed 1s infinite alternate;
    }
    @keyframes blinkRed {
      0% { opacity: 0.4; }
      100% { opacity: 1; }
    }

    .pulse-green {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 8px #22c55e;
      animation: blinkGreen 1.2s infinite alternate;
    }
    @keyframes blinkGreen {
      0% { opacity: 0.4; }
      100% { opacity: 1; }
    }

    /* CONTENIDO DEL PORTAL SUPERPUESTO */
    .brand-content {
      position: relative;
      z-index: 10;
      max-width: 520px;
      width: 100%;
    }

    .glass-hero-card {
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 1.5rem;
      padding: 2.25rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .logo-img {
      width: 84px;
      height: 84px;
      object-fit: contain;
      border-radius: 50%;
      background: #fff;
      box-shadow:
        0 12px 30px rgba(0, 0, 0, 0.4),
        0 0 0 3px rgba(255, 255, 255, 0.4);
      flex-shrink: 0;
    }

    .brand-titles {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .brand-text {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.8rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .brand-sub {
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.85);
    }

    .brand-copy h2 {
      font-family: var(--font-display);
      font-size: clamp(1.5rem, 2.5vw, 2.1rem);
      font-weight: 800;
      line-height: 1.2;
      margin: 0 0 0.75rem;
      color: #ffffff;
      letter-spacing: -0.02em;
    }
    .brand-copy p {
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.82);
    }

    .brand-highlights {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    .brand-highlights li {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.88rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
    }
    .brand-highlights .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 10px #38bdf8;
      flex-shrink: 0;
    }

    /* SECCIÓN DERECHA DEL LOGIN */
    .auth-left {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1.5rem;
      background: var(--bg-page);
    }

    .auth-card {
      position: relative;
      width: 100%;
      max-width: 440px;
    }

    .auth-theme-toggle {
      position: absolute;
      top: 1rem;
      right: 1rem;
      z-index: 5;
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .auth-theme-toggle:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .auth-footer {
      margin-top: 2rem;
      font-size: 0.8rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .dot-sep { opacity: 0.5; }

    @media (max-width: 960px) {
      .auth-shell {
        grid-template-columns: 1fr;
      }
      .auth-brand {
        min-height: 480px;
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
