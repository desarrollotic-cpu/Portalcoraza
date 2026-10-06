import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { AuthUser } from './core/models/auth.model';

const PORTAL_ORIGINS = ['https://portalcoraza-web.onrender.com', 'http://localhost:4200'];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    if (window.parent === window) return;
    window.addEventListener('message', (ev) => this.takePortalSession(ev));
    const ping = () => window.parent.postMessage({ type: 'coraza-minuta-ready' }, '*');
    ping();
    setTimeout(ping, 400);
    setTimeout(ping, 1200);
  }

  private takePortalSession(ev: MessageEvent): void {
    if (!PORTAL_ORIGINS.includes(ev.origin)) return;
    const data = ev.data as {
      type?: string;
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
      tenantId?: string;
    };
    if (data?.type !== 'coraza-minuta-session') return;
    if (!this.auth.adoptSession(data)) return;
    void this.router.navigateByUrl('/');
  }
}
