import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
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
    <div class="auth-shell">
      <!-- PANEL IZQUIERDO: ESCENARIO GIGANTE DE LA MASCOTA -->
      <aside class="auth-brand">
        <!-- MALLA Y EFECTOS DE FONDO -->
        <div class="brand-mesh"></div>
        <div class="brand-orbs">
          <span class="orb orb-1"></span>
          <span class="orb orb-2"></span>
        </div>

        <div class="mascot-stage">
          <!-- CÁPSULA GIGANTE DE VIDEO DE LA MASCOTA -->
          <div class="video-capsule">
            <video
              #mascotVideo
              class="mascot-player"
              src="/videos/mascota-coraza.mp4"
              autoplay
              [muted]="true"
              loop
              playsinline
              preload="auto"
              (loadedmetadata)="onLoadedVideo($event)"
            ></video>

            <!-- LUZ HOLOGRÁFICA / RAYO DE ESCANEO -->
            <div class="scan-light"></div>

            <!-- HUDS DE SEGURIDAD EN LA CÁPSULA -->
            <div class="hud-bar top">
              <span class="hud-badge live">
                <span class="pulse-dot green"></span>
                GUARDIÁN OFICIAL EN VIVO
              </span>
              <span class="hud-badge tech">CORAZA // SEC-2027</span>
            </div>

            <div class="hud-bar bottom">
              <div class="hud-mascot-info">
                <strong class="mascot-name">🐊 COCO</strong>
                <span class="mascot-role">Mascota de Bienvenida Coraza</span>
              </div>
              <span class="hud-badge status">MODO VIGILANCIA</span>
            </div>
          </div>

          <!-- ENCABEZADO Y TEXTO DEL PORTAL -->
          <div class="brand-info-card">
            <div class="brand-logo-row">
              <img
                class="logo-img"
                src="/brand/logo-coraza-cta.png"
                width="64"
                height="64"
                alt="Coraza Seguridad C.T.A."
              />
              <div class="brand-titles">
                <h1 class="brand-text">Portal Coraza</h1>
                <span class="brand-sub">Coraza Seguridad C.T.A.</span>
              </div>
            </div>

            <p class="brand-desc">
              Portal operativo y centro de inteligencia para tu equipo de seguridad, talento humano y operaciones.
            </p>
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
      grid-template-columns: 1.15fr minmax(420px, 0.85fr);
      background: var(--bg-page);
    }

    .auth-brand {
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 2rem;
      background: #090e1a;
      color: #ffffff;
    }

    .brand-mesh {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 20%, #1e1b4b 0%, #030712 100%);
      opacity: 0.95;
    }

    .brand-orbs {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
    }
    .orb-1 {
      width: 420px;
      height: 420px;
      background: radial-gradient(circle, #3b82f6 0%, transparent 70%);
      top: -100px;
      left: -100px;
      opacity: 0.45;
    }
    .orb-2 {
      width: 380px;
      height: 380px;
      background: radial-gradient(circle, #8b5cf6 0%, transparent 70%);
      bottom: -80px;
      right: -80px;
      opacity: 0.35;
    }

    .mascot-stage {
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 580px;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    /* CÁPSULA GIGANTE DE VIDEO */
    .video-capsule {
      position: relative;
      width: 100%;
      height: 380px;
      border-radius: 1.75rem;
      overflow: hidden;
      background: #000000;
      border: 2px solid rgba(59, 130, 246, 0.4);
      box-shadow:
        0 25px 50px -12px rgba(0, 0, 0, 0.7),
        0 0 30px rgba(59, 130, 246, 0.25),
        inset 0 0 40px rgba(0, 0, 0, 0.6);
    }

    /* REPRODUCTOR DE VIDEO A TODO TAMAÑO */
    .mascot-player {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scale(1.02);
      filter: contrast(1.05) saturate(1.1);
    }

    /* RAYO DE ESCANEO LÁSER */
    .scan-light {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 3px;
      background: linear-gradient(90deg, transparent, #38bdf8, #818cf8, transparent);
      box-shadow: 0 0 12px #38bdf8;
      animation: scanCycle 3.5s ease-in-out infinite alternate;
      pointer-events: none;
      z-index: 5;
    }
    @keyframes scanCycle {
      0% { top: 0%; opacity: 0.2; }
      50% { opacity: 0.9; }
      100% { top: 99%; opacity: 0.2; }
    }

    /* HUDS DECORATIVOS DENTRO DE LA CÁPSULA */
    .hud-bar {
      position: absolute;
      left: 1rem;
      right: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 6;
      pointer-events: none;
    }
    .hud-bar.top { top: 1rem; }
    .hud-bar.bottom {
      bottom: 1rem;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 0.85rem;
      padding: 0.6rem 1rem;
    }

    .hud-badge {
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.3rem 0.65rem;
      border-radius: 999px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .hud-badge.live {
      background: rgba(15, 23, 42, 0.85);
      color: #86efac;
      border: 1px solid rgba(34, 197, 94, 0.4);
      display: flex;
      align-items: center;
      gap: 0.45rem;
      backdrop-filter: blur(8px);
    }
    .hud-badge.tech {
      background: rgba(15, 23, 42, 0.7);
      color: #94a3b8;
      border: 1px solid rgba(255, 255, 255, 0.1);
      font-family: monospace;
    }
    .hud-badge.status {
      background: rgba(30, 58, 138, 0.6);
      color: #93c5fd;
      border: 1px solid rgba(59, 130, 246, 0.4);
      font-size: 0.68rem;
    }

    .hud-mascot-info { display: flex; flex-direction: column; }
    .mascot-name { font-size: 0.95rem; color: #ffffff; font-weight: 900; }
    .mascot-role { font-size: 0.72rem; color: #94a3b8; font-weight: 600; }

    .pulse-dot.green {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 8px #22c55e;
      animation: pulseAnim 1.2s infinite alternate;
    }
    @keyframes pulseAnim {
      0% { opacity: 0.4; }
      100% { opacity: 1; }
    }

    /* TARJETA DE INFORMACIÓN DEBAJO DEL VIDEO */
    .brand-info-card {
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 1.25rem;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .brand-logo-row {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .logo-img {
      width: 52px;
      height: 52px;
      object-fit: contain;
      border-radius: 50%;
      background: #ffffff;
      padding: 2px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    .brand-titles { display: flex; flex-direction: column; }
    .brand-text {
      margin: 0;
      font-size: 1.45rem;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.1;
    }
    .brand-sub {
      font-size: 0.78rem;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .brand-desc {
      margin: 0;
      font-size: 0.88rem;
      color: #cbd5e1;
      line-height: 1.4;
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
      .video-capsule {
        height: 260px;
      }
    }
  `,
})
export class AuthLayout implements AfterViewInit {
  readonly theme = inject(ThemeService);
  readonly year = new Date().getFullYear();
  readonly sunIcon = LucideSun;
  readonly moonIcon = LucideMoon;

  @ViewChild('mascotVideo') videoRef!: ElementRef<HTMLVideoElement>;

  ngAfterViewInit(): void {
    this.playVideo();
  }

  onLoadedVideo(e: Event): void {
    const video = e.target as HTMLVideoElement;
    if (video) {
      video.muted = true;
      video.play().catch(() => {});
    }
  }

  private playVideo(): void {
    if (this.videoRef?.nativeElement) {
      const v = this.videoRef.nativeElement;
      v.muted = true;
      v.play().catch(() => {
        // En caso de bloqueo estricto del navegador, inicia con cualquier clic en la pantalla
        const playOnInteraction = () => {
          v.play().catch(() => {});
          window.removeEventListener('click', playOnInteraction);
          window.removeEventListener('touchstart', playOnInteraction);
        };
        window.addEventListener('click', playOnInteraction, { once: true });
        window.addEventListener('touchstart', playOnInteraction, { once: true });
      });
    }
  }
}
