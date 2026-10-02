export type PersonnelFileStatus = 'ACTIVO' | 'RETIRADO' | 'ARCHIVADO';

export function personnelFileStatus(
  rrhhStatus: string | null | undefined,
  archiveCode: number | null | undefined,
): PersonnelFileStatus {
  if (archiveCode != null && Number(archiveCode) > 0) return 'ARCHIVADO';
  const s = (rrhhStatus || '').toUpperCase();
  if (s === 'RETIRADO' || s === 'INACTIVO') return 'RETIRADO';
  return 'ACTIVO';
}

export function personnelFileLabel(
  status: PersonnelFileStatus,
  archiveCode?: number | null,
): string {
  if (status === 'ARCHIVADO') {
    return archiveCode ? `Archivado #${archiveCode}` : 'Archivado';
  }
  if (status === 'RETIRADO') return 'Retirado';
  return 'Activo';
}

export function personnelFileHint(status: PersonnelFileStatus): string {
  if (status === 'ARCHIVADO') return 'Ya tiene carpeta y código en Gestión Documental';
  if (status === 'RETIRADO') return 'Salió de la empresa; Documental aún no archivó la carpeta';
  return 'Personal activo en la empresa';
}
