import { Component } from '@angular/core';
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
        <img
          class="brand-logo"
          src="/images/coraza-logo.png"
          alt="Coraza"
          (error)="onLogoError($event)"
        />
      </aside>
    </div>
  `,
  styles: `
    .auth-shell {
      min-height: 100vh;
      display: grid;
      grid-template-columns: minmax(360px, 440px) 1fr;
      background: var(--gradient-login);
    }

    .auth-left {
      display: flex;
      justify-content: flex-start;
      align-items: flex-start;
      padding: 10vh 2.5rem 2rem 3.5rem;
      background: var(--coraza-surface);
      border-right: 1px solid var(--coraza-border);
      box-shadow: 4px 0 24px rgba(15, 23, 42, 0.06);
    }

    .auth-brand {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 3rem;
      background: var(--gradient-login);
    }

    .brand-logo {
      width: min(520px, 72%);
      max-height: min(420px, 60vh);
      object-fit: contain;
      filter: drop-shadow(0 12px 28px rgba(15, 23, 42, 0.18));
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
        padding: 8vh 1.5rem 2rem;
        border-right: none;
        box-shadow: none;
      }
    }
  `,
})
export class AuthLayout {
  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
