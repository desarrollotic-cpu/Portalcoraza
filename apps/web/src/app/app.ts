import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { CorazaPet } from './core/components/coraza-pet/coraza-pet';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CorazaPet],
  template: `
    <router-outlet />
    <app-coraza-pet />
  `,
  styleUrl: './app.scss',
})
export class App {
  /** Inicializa el tema global (efecto en documentElement). */
  private readonly theme = inject(ThemeService);
}

