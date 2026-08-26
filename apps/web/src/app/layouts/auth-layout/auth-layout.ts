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
    <div class="auth-outer-canvas">
      <!-- FORMAS AMBIENTALES DECORATIVAS DEL FONDO -->
      <div class="bg-shape-1"></div>
      <div class="bg-shape-2"></div>
      <div class="bg-shape-3"></div>

      <!-- CONTENEDOR PRINCIPAL FLOTANTE ESTILO TARJETA PREMIUM -->
      <main class="auth-main-container">
        <!-- LADO IZQUIERDO: EL VIDEO OCUPA TODO EL CUADRO AZUL COMPLETO -->
        <div class="auth-hero-side">
          <!-- VIDEO DE FONDO TOTAL EN EL CUADRO IZQUIERDO -->
          <video
            #mascotVideo
            class="hero-full-video"
            src="/videos/mascota-coraza.mp4"
            autoplay
            [muted]="true"
            loop
            playsinline
            preload="auto"
            (loadedmetadata)="onLoadedVideo($event)"
          ></video>

          <!-- CAPAS DE INTEGRACIÓN Y DEGRADADO CORPORATIVO -->
          <div class="video-blue-gradient"></div>
          <div class="video-ambient-vignette"></div>

          <!-- CABECERA SUPERIOR IZQUIERDA -->
          <header class="hero-header">
            <div class="logo-badge">
              <img
                class="hero-logo-img"
                src="/brand/logo-coraza-cta.png"
                width="40"
                height="40"
                alt="Logo Coraza"
              />
            </div>
            <div class="brand-text-col">
              <span class="hero-brand-name">Portal Coraza</span>
              <span class="hero-brand-sub">Seguridad C.T.A.</span>
            </div>
          </header>

          <!-- FOOTER INFERIOR IZQUIERDO -->
          <footer class="hero-footer">
            <p>© {{ year }} Coraza Seguridad C.T.A. · Vigilancia y Talento Humano</p>
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
      background: #1b2032;
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
      background: linear-gradient(135deg, #f43f5e 0%, #fb7185 100%);
      opacity: 0.85;
      pointer-events: none;
    }
    .bg-shape-2 {
      position: absolute;
      bottom: -12vw;
      left: -8vw;
      width: 52vw;
      height: 52vw;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
      opacity: 0.4;
      filter: blur(50px);
      pointer-events: none;
    }
    .bg-shape-3 {
      position: absolute;
      bottom: 20%;
      right: 15%;
      width: 25vw;
      height: 25vw;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(236, 72, 153, 0.25) 0%, transparent 70%);
      filter: blur(60px);
      pointer-events: none;
    }

    /* CONTENEDOR TIPO TARJETA GIGANTE CENTRADA */
    .auth-main-container {
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 1080px;
      min-height: 590px;
      display: grid;
      grid-template-columns: 1.18fr 0.92fr;
      border-radius: 2.25rem;
      overflow: hidden;
      box-shadow: 0 30px 70px -15px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.1);
      background: var(--bg-surface, #ffffff);
    }

    /* LADO IZQUIERDO: EL VIDEO LLENA TODO EL CUADRO */
    .auth-hero-side {
      position: relative;
      padding: 2.25rem 2.5rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      color: #ffffff;
      overflow: hidden;
      background: #1d4ed8;
    }

    /* VIDEO DE FONDO A TODO TAMAÑO EN EL CUADRO IZQUIERDO */
    .hero-full-video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      transform: scale(1.05);
      z-index: 0;
      filter: contrast(1.08) saturate(1.15);
    }

    /* DEGRADADO AZUL QUE INTEGRA EL VIDEO DE FORMA PREMIUM */
    .video-blue-gradient {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        145deg,
        rgba(37, 99, 235, 0.35) 0%,
        rgba(29, 78, 216, 0.2) 40%,
        rgba(30, 58, 138, 0.6) 100%
      );
      mix-blend-mode: multiply;
      pointer-events: none;
      z-index: 1;
    }

    .video-ambient-vignette {
      position: absolute;
      inset: 0;
      background: radial-gradient(
        circle at 50% 40%,
        transparent 30%,
        rgba(15, 23, 42, 0.35) 75%,
        rgba(15, 23, 42, 0.7) 100%
      );
      pointer-events: none;
      z-index: 1;
    }

    .hero-header {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      z-index: 5;
    }
    .logo-badge {
      background: #ffffff;
      border-radius: 50%;
      padding: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
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
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #ffffff;
      line-height: 1.15;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }
    .hero-brand-sub {
      font-size: 0.75rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.9);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
    }

    .hero-greeting-box {
      z-index: 5;
      display: flex;
      justify-content: center;
      margin: auto 0 1rem 0;
    }

    /* INSIGNIA DE SALUDO */
    .greeting-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 0.6rem 1.4rem;
      border-radius: 999px;
      font-size: 0.95rem;
      font-weight: 700;
      color: #ffffff;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
    }

    .online-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 10px #22c55e;
      animation: pulseDot 1.5s infinite;
    }
    @keyframes pulseDot {
      0% { transform: scale(0.9); opacity: 0.7; }
      50% { transform: scale(1.3); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0.7; }
    }

    .hero-footer {
      z-index: 5;
    }
    .hero-footer p {
      margin: 0;
      font-size: 0.78rem;
      color: rgba(255, 255, 255, 0.9);
      font-weight: 500;
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
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
        min-height: 280px;
      }
      .auth-form-side {
        padding: 2rem 1.5rem;
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
    this.startVideo();
  }

  onLoadedVideo(e: Event): void {
    const video = e.target as HTMLVideoElement;
    if (video) {
      video.muted = true;
      video.play().catch(() => {});
    }
  }

  private startVideo(): void {
    if (this.videoRef?.nativeElement) {
      const v = this.videoRef.nativeElement;
      v.muted = true;
      v.play().catch(() => {
        const trigger = () => {
          v.play().catch(() => {});
          window.removeEventListener('click', trigger);
          window.removeEventListener('touchstart', trigger);
        };
        window.addEventListener('click', trigger, { once: true });
        window.addEventListener('touchstart', trigger, { once: true });
      });
    }
  }
}
