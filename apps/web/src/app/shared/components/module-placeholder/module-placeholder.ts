import { Component, input } from '@angular/core';

@Component({
  selector: 'app-module-placeholder',
  template: `
    <div class="placeholder">
      <h2>{{ heading() }}</h2>
      <p>{{ message() }}</p>
    </div>
  `,
  styles: `
    .placeholder h2 {
      margin: 0 0 0.5rem;
      font-size: 1.1rem;
      color: var(--primary-dark);
    }
    .placeholder p {
      margin: 0;
      color: var(--coraza-text-muted);
    }
  `,
})
export class ModulePlaceholder {
  readonly heading = input.required<string>();
  readonly message = input('Esta pantalla se implementará en el siguiente paso del módulo.');
}
