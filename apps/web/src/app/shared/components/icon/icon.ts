import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Type, computed, input } from '@angular/core';

@Component({
  selector: 'app-icon',
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container
      *ngComponentOutlet="icon(); inputs: outletInputs()"
    ></ng-container>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
    }
    :host svg {
      width: var(--icon-size, 1em);
      height: var(--icon-size, 1em);
      display: block;
    }
  `,
  host: {
    '[style.--icon-size.px]': 'size()',
  },
})
export class Icon {
  readonly icon = input.required<Type<unknown>>();
  readonly size = input<number | string>(20);
  readonly strokeWidth = input<number | string>(1.8);
  readonly color = input<string>('currentColor');

  readonly outletInputs = computed(() => ({
    size: this.size(),
    strokeWidth: this.strokeWidth(),
    color: this.color(),
  }));
}
