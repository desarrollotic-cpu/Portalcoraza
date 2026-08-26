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
      <!-- FONDO AMBIENTAL CON FORMAS CURVAS -->
      <div class="bg-shape-1"></div>
      <div class="bg-shape-2"></div>

      <!-- CONTENEDOR PRINCIPAL FLOTANTE ESTILO TARJETA MODERNA (COMO LA REFERENCIA) -->
      <main class="auth-main-container">
        <!-- LADO IZQUIERDO: SALUDO Y MASCOTA DE BIENVENIDA -->
        <div class="auth-hero-side">
          <!-- CABECERA DE MARCA SUPERIOR IZQUIERDA -->
          <header class="hero-header">
            <img
              class="hero-logo-img"
              src="/brand/logo-coraza-cta.png"
              width="44"
              height="44"
              alt="Logo Coraza"
            />
            <span class="hero-brand-name">Portal Coraza</span>
          </header>

          <!-- ESCENARIO CENTRAL: MASCOTA EN VIDEO DE SALUDO Y BIENVENIDA -->
          <div class="mascot-greeting-wrapper">
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
              <div class="mascot-ring-glow"></div>
            </div>

            <div class="greeting-badge">
              <span class="online-dot"></span>
              ¡Hola! Soy Coco, tu guardián
            </div>
          </div>

          <!-- FOOTER INFERIOR IZQUIERDO -->
          <footer class="hero-footer">
            <p>© {{ year }} Coraza Seguridad C.T.A. Todos los derechos reservados.</p>
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
            <span>Seguridad privada y talento humano</span>
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
      background: #1e2235;
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
    }

    /* FORMAS ABSTRACTAS DECORATIVAS DEL FONDO */
    .bg-shape-1 {
      position: absolute;
      top: -10vw;
      right: -10vw;
      width: 45vw;
      height: 45vw;
      border-radius: 50%;
      background: linear-gradient(135deg, #f43f5e 0%, #fb7185 100%);
      opacity: 0.85;
      pointer-events: none;
    }
    .bg-shape-2 {
      position: absolute;
      bottom: -15vw;
      left: -10vw;
      width: 50vw;
      height: 50vw;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
      opacity: 0.35;
      filter: blur(40px);
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
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
      background: var(--bg-surface, #ffffff);
    }

    /* LADO IZQUIERDO: DEGRADADO AZUL/VIOLETA CON LA MASCOTA */
    .auth-hero-side {
      background: linear-gradient(145deg, #3b82f6 0%, #2563eb 45%, #4f46e5 100%);
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
      gap: 0.75rem;
      z-index: 2;
    }
    .hero-logo-img {
      border-radius: 50%;
      background: #ffffff;
      padding: 2px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
    }
    .hero-brand-name {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #ffffff;
    }

    /* ESCENARIO DE SALUDO DE LA MASCOTA */
    .mascot-greeting-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.25rem;
      margin: 1.5rem 0;
      z-index: 2;
    }

    .mascot-avatar-frame {
      position: relative;
      width: 250px;
      height: 250px;
      border-radius: 50%;
      overflow: hidden;
      background: #000000;
      box-shadow:
        0 20px 40px rgba(0, 0, 0, 0.4),
        0 0 0 6px rgba(255, 255, 255, 0.25);
    }

    .mascot-video-element {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transform: scale(1.05);
    }

    .mascot-ring-glow {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      box-shadow: inset 0 0 25px rgba(0, 0, 0, 0.5);
      pointer-events: none;
    }

    .greeting-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.35);
      padding: 0.5rem 1.15rem;
      border-radius: 999px;
      font-size: 0.92rem;
      font-weight: 700;
      color: #ffffff;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
    }

    .online-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 8px #22c55e;
      animation: pulseDot 1.5s infinite;
    }
    @keyframes pulseDot {
      0% { transform: scale(0.9); opacity: 0.7; }
      50% { transform: scale(1.3); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0.7; }
    }

    .hero-footer {
      z-index: 2;
    }
    .hero-footer p {
      margin: 0;
      font-size: 0.78rem;
      color: rgba(255, 255, 255, 0.8);
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
      .mascot-avatar-frame {
        width: 180px;
        height: 180px;
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
