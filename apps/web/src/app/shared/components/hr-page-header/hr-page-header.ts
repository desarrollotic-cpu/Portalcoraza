import { Component, input } from '@angular/core';

@Component({
  selector: 'app-hr-page-header',
  template: `
    <header class="hr-page-header">
      <div class="hr-page-header__main">
        <h1>{{ title() }}</h1>
        @if (badge()) {
          <span class="hr-page-header__badge">{{ badge() }}</span>
        }
        @if (subtitle()) {
          <p class="hr-page-header__hint">{{ subtitle() }}</p>
        }
      </div>
      <div class="hr-page-header__actions">
        <ng-content select="[actions]" />
      </div>
    </header>
  `,
})
export class HrPageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly badge = input<string>();
}
