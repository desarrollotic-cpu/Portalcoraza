export type PersonnelFileStatus = 'ACTIVO' | 'RETIRADO' | 'ARCHIVADO';

/** Archivado gana: ya hay carpeta en Documental. Retirado = salió y aún no se archiva. */
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
