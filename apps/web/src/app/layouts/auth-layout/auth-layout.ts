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
        <!-- LADO IZQUIERDO: ESCENARIO INTEGRADO DE LA MASCOTA CON EL ENTORNO -->
        <div class="auth-hero-side">
          <!-- CABECERA DE MARCA -->
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

          <!-- ESCENARIO CENTRAL: MASCOTA INTEGRADA AL ENTORNO CON FORMAS ORGÁNICAS -->
          <div class="mascot-greeting-wrapper">
            <div class="mascot-stage-container">
              <!-- LISTONES Y FORMAS GEOMÉTRICAS DECORATIVAS (ESTILO REFERENCIA) -->
              <div class="decorative-ribbon ribbon-gold"></div>
              <div class="decorative-ribbon ribbon-cyan"></div>
              <div class="decorative-ribbon ribbon-pink"></div>
              <div class="ambient-glow"></div>

              <!-- MARCO PRINCIPAL DEL VIDEO CON INTEGRACIÓN DE COLOR AL FONDO -->
              <div class="mascot-avatar-frame">
                <video
                  #mascotVideo
                  class="mascot-video-element"
                  src="/videos/mascota-coraza.mp4"
                  autoplay
                  [muted]="true"
                  loop
                  playsinline
                  preload="auto"
                  (loadedmetadata)="onLoadedVideo($event)"
                ></video>

                <!-- CAPA DE COLOR Y LUZ PARA INTEGRAR EL FONDO DEL VIDEO CON EL ENTORNO AZUL -->
                <div class="video-color-tint"></div>
                <div class="video-radial-feather"></div>
                <div class="video-ambient-vignette"></div>
              </div>
            </div>

            <!-- INSIGNIA DE SALUDO FLOTANTE -->
            <div class="greeting-badge">
              <span class="online-dot"></span>
              ¡Hola! Soy Coco, tu guardián oficial
            </div>
          </div>

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

    /* LADO IZQUIERDO: DEGRADADO AZUL CON INTEGRACIÓN COMPLETA DE COLOR */
    .auth-hero-side {
      background: linear-gradient(145deg, #2563eb 0%, #1d4ed8 40%, #3b82f6 75%, #4f46e5 100%);
      padding: 2.25rem 2.5rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      color: #ffffff;
      position: relative;
      overflow: hidden;
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
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
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
      font-size: 1.3rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #ffffff;
      line-height: 1.15;
    }
    .hero-brand-sub {
      font-size: 0.75rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.8);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    /* ESCENARIO DE SALUDO DE LA MASCOTA CON ADORNOS */
    .mascot-greeting-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
      margin: 1rem 0;
      z-index: 5;
    }

    .mascot-stage-container {
      position: relative;
      width: 270px;
      height: 270px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* LISTONES DECORATIVOS ORGÁNICOS (ESTILO REFERENCIA) */
    .decorative-ribbon {
      position: absolute;
      border-radius: 999px;
      pointer-events: none;
      z-index: 1;
    }
    .ribbon-gold {
      width: 210px;
      height: 16px;
      background: linear-gradient(90deg, #f59e0b, #fbbf24);
      bottom: 25px;
      left: -20px;
      transform: rotate(-35deg);
      box-shadow: 0 6px 20px rgba(245, 158, 11, 0.45);
    }
    .ribbon-pink {
      width: 170px;
      height: 16px;
      background: linear-gradient(90deg, #f43f5e, #fb7185);
      top: 35px;
      right: -15px;
      transform: rotate(42deg);
      box-shadow: 0 6px 20px rgba(244, 63, 94, 0.45);
    }
    .ribbon-cyan {
      width: 140px;
      height: 14px;
      background: linear-gradient(90deg, #38bdf8, #818cf8);
      bottom: 45px;
      right: -10px;
      transform: rotate(-25deg);
      box-shadow: 0 6px 18px rgba(56, 189, 248, 0.45);
    }

    .ambient-glow {
      position: absolute;
      inset: -20px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(96, 165, 250, 0.5) 0%, rgba(59, 130, 246, 0.2) 50%, transparent 75%);
      filter: blur(25px);
      z-index: 0;
    }

    /* MARCO DEL VIDEO CON TRANSICIÓN INTEGRADA */
    .mascot-avatar-frame {
      position: relative;
      width: 250px;
      height: 250px;
      border-radius: 50%;
      overflow: hidden;
      background: radial-gradient(circle, #3b82f6 0%, #1d4ed8 60%, #1e3a8a 100%);
      box-shadow:
        0 20px 45px rgba(15, 23, 42, 0.45),
        0 0 0 6px rgba(255, 255, 255, 0.35);
      z-index: 2;
    }

    /* VIDEO DEL COCODRILO CON FILTROS Y AJUSTE DE COLOR */
    .mascot-video-element {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transform: scale(1.06);
      filter: contrast(1.12) saturate(1.18) brightness(1.02);
    }

    /* INTEGRACIÓN DEL COLOR DE FONDO DEL VIDEO CON EL ENTORNO AZUL */
    .video-color-tint {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle, rgba(37, 99, 235, 0.25) 0%, rgba(30, 64, 175, 0.45) 80%, rgba(30, 58, 138, 0.7) 100%);
      mix-blend-mode: color;
      pointer-events: none;
    }

    .video-radial-feather {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, transparent 40%, rgba(29, 78, 216, 0.3) 70%, rgba(30, 58, 138, 0.8) 100%);
      mix-blend-mode: multiply;
      pointer-events: none;
    }

    .video-ambient-vignette {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      box-shadow:
        inset 0 0 35px rgba(29, 78, 216, 0.6),
        inset 0 0 15px rgba(255, 255, 255, 0.25);
      pointer-events: none;
    }

    /* INSIGNIA DE SALUDO */
    .greeting-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      background: rgba(255, 255, 255, 0.22);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.4);
      padding: 0.55rem 1.25rem;
      border-radius: 999px;
      font-size: 0.92rem;
      font-weight: 700;
      color: #ffffff;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
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
      color: rgba(255, 255, 255, 0.85);
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
      .mascot-stage-container {
        width: 210px;
        height: 210px;
      }
      .mascot-avatar-frame {
        width: 190px;
        height: 190px;
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
