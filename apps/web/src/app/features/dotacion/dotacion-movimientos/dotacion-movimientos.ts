import { Component } from '@angular/core';
import { ModulePlaceholder } from '../../../shared/components/module-placeholder/module-placeholder';

@Component({
  selector: 'app-dotacion-movimientos',
  imports: [ModulePlaceholder],
  template: `
    <app-module-placeholder
      heading="Historial de movimientos"
      message="Historial de ingresos, entregas, ajustes y reversiones de dotación."
    />
  `,
})
export class DotacionMovimientos {}
