import {
  Directive,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
} from '@angular/core';
import { AuthService } from '../services/auth.service';

@Directive({
  selector: '[hasPermission]',
})
export class HasPermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);

  readonly hasPermission = input.required<string>();

  constructor() {
    effect(() => {
      const required = this.hasPermission();
      const allowed = this.auth.hasPermission(required);
      this.viewContainer.clear();
      if (allowed) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    });
  }
}
