import { Component } from '@angular/core';
import { ModulePlaceholder } from '../../../shared/components/module-placeholder/module-placeholder';

@Component({
  selector: 'app-dotacion-sin-dotacion',
  imports: [ModulePlaceholder],
  template: `
    <app-module-placeholder
      heading="Sin dotación 7+ meses"
      message="Listado de asociados activos que no han recibido dotación en los últimos 7 meses. Datos del asociado desde RRHH; cálculo de entregas desde Dotación."
    />
  `,
})
export class DotacionSinDotacion {}
