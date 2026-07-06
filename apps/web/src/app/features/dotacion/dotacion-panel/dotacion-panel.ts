import { Component } from '@angular/core';
import { ModulePlaceholder } from '../../../shared/components/module-placeholder/module-placeholder';

@Component({
  selector: 'app-dotacion-panel',
  imports: [ModulePlaceholder],
  template: `
    <app-module-placeholder
      heading="Panel principal"
      message="Métricas de stock, entregas del día y alertas de inventario bajo (como en coraza-system). Próximo paso del módulo Dotación."
    />
  `,
})
export class DotacionPanel {}
