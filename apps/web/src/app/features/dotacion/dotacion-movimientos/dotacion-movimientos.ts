import { Component } from '@angular/core';
import { ModulePlaceholder } from '../../../shared/components/module-placeholder/module-placeholder';

@Component({
  selector: 'app-dotacion-movimientos',
  imports: [ModulePlaceholder],
  template: `
    <app-module-placeholder
      heading="Movimientos de inventario"
      message="Historial de entradas, salidas y ajustes de stock por variante. Próximo paso del módulo Dotación."
    />
  `,
})
export class DotacionMovimientos {}
