import { personnelFileLabel, personnelFileStatus } from './personnel-file.policy';

describe('personnel-file.policy', () => {
  it('archivado gana aunque RRHH lo tenga retirado', () => {
    expect(personnelFileStatus('RETIRADO', 120)).toBe('ARCHIVADO');
    expect(personnelFileLabel('ARCHIVADO', 120)).toBe('Archivado #120');
  });

  it('retirado sin carpeta queda pendiente de archivo', () => {
    expect(personnelFileStatus('RETIRADO', null)).toBe('RETIRADO');
    expect(personnelFileStatus('INACTIVO', undefined)).toBe('RETIRADO');
    expect(personnelFileLabel('RETIRADO')).toBe('Retirado');
  });

  it('activo, vacaciones y suspendido siguen en la empresa', () => {
    expect(personnelFileStatus('ACTIVO', null)).toBe('ACTIVO');
    expect(personnelFileStatus('VACACIONES', null)).toBe('ACTIVO');
    expect(personnelFileStatus('SUSPENDIDO', null)).toBe('ACTIVO');
  });
});
