import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  template: `
    <div class="auth-shell">
      <router-outlet />
    </div>
  `,
  styles: `
    .auth-shell {
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: linear-gradient(
        160deg,
        var(--coraza-blue-50) 0%,
        #dceefb 45%,
        var(--coraza-blue-100) 100%
      );
    }
  `,
})
export class AuthLayout {}
