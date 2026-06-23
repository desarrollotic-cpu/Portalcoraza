import { AfterViewInit, Component, ElementRef, signal, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  template: `
    <div class="auth-shell">
      <section class="auth-left">
        <router-outlet />
      </section>
      <aside class="auth-brand" aria-hidden="true">
        <video
          #brandVideo
          class="brand-video"
          src="/videos/coraza-logo.mp4"
          autoplay
          muted
          loop
          playsinline
          preload="auto"
        ></video>
        @if (showBrandText()) {
          <p class="brand-text">Coraza</p>
        }
      </aside>
    </div>
  `,
  styles: `
    .auth-shell {
      min-height: 100vh;
      display: grid;
      grid-template-columns: minmax(420px, 38vw) 1fr;
      background: var(--gradient-login);
    }

    .auth-left {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: center;
      min-height: 100vh;
      padding: 2.5rem 3.5rem 2.5rem 4rem;
      background: var(--coraza-surface);
      border-right: 1px solid var(--coraza-border);
      box-shadow: 4px 0 24px rgba(15, 23, 42, 0.06);
      min-width: 0;
    }

    .auth-brand {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 3rem;
      background: var(--gradient-login);
      position: relative;
      min-height: 100vh;
    }

    .brand-video {
      width: min(560px, 78%);
      max-height: min(480px, 70vh);
      object-fit: contain;
      filter: drop-shadow(0 12px 28px rgba(15, 23, 42, 0.18));
    }

    .brand-text {
      margin: 0;
      font-size: clamp(2.5rem, 6vw, 4rem);
      font-weight: 700;
      color: var(--primary-dark);
      letter-spacing: 0.04em;
    }

    @media (max-width: 900px) {
      .auth-shell {
        grid-template-columns: 1fr;
      }

      .auth-brand {
        display: none;
      }

      .auth-left {
        min-height: 100vh;
        justify-content: center;
        padding: 2rem 1.5rem;
        border-right: none;
        box-shadow: none;
      }
    }
  `,
})
export class AuthLayout implements AfterViewInit {
  private readonly brandVideo = viewChild<ElementRef<HTMLVideoElement>>('brandVideo');

  readonly showBrandText = signal(false);

  ngAfterViewInit(): void {
    const video = this.brandVideo()?.nativeElement;
    if (!video) {
      this.showBrandText.set(true);
      return;
    }

    const onError = (): void => {
      video.style.display = 'none';
      this.showBrandText.set(true);
    };

    video.addEventListener('error', onError, { once: true });

    void video.play().catch(onError);
  }
}
