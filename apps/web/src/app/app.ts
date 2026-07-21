import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styleUrl: './app.scss',
})
export class App {
  /** Inicializa el tema global (efecto en documentElement). */
  private readonly theme = inject(ThemeService);
}
