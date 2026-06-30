export const TALLAS_CONFIG: Record<string, string[]> = {
  botas: ['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
  camisa: ['8', '10', '12', '14', '16', '18', '34', '36', '38', '40', '42', '44', '46', '48', '50'],
  pantalon: ['8', '10', '12', '14', '16', '18', '20', '28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48', '50'],
  overol: ['36', '38', '40', '42', '44', '46', '48', '50'],
  chaqueta: ['28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48', '50'],
  chaqueta_impermeable: ['36', '38', '40', '42', '44'],
};

export const ELEMENTOS_CON_TALLA = [
  'botas',
  'camisa',
  'chaqueta',
  'chaqueta_impermeable',
  'overol',
  'pantalon',
];

const COINCIDENCIAS = [
  { palabras: ['pantalon', 'pantalón'], categoria: 'pantalon' },
  { palabras: ['camisa', 'camisas'], categoria: 'camisa' },
  { palabras: ['impermeable'], categoria: 'chaqueta_impermeable' },
  { palabras: ['chaqueta', 'chaquetas', 'jacket'], categoria: 'chaqueta' },
  { palabras: ['overol', 'overoles', 'overall'], categoria: 'overol' },
  { palabras: ['bota', 'botas', 'zapato', 'zapatos', 'calzado', 'valeta'], categoria: 'botas' },
];

export function requiereTalla(tipo: string): boolean {
  if (!tipo) return false;
  const tipoLower = tipo.toLowerCase().trim();
  if (ELEMENTOS_CON_TALLA.includes(tipoLower)) return true;
  if (tipoLower === 'uniforme' || tipoLower === 'calzado') return true;
  return COINCIDENCIAS.some((grupo) =>
    grupo.palabras.some((palabra) => tipoLower.includes(palabra)),
  );
}

export function getTallasDisponibles(tipo: string): string[] {
  if (!tipo) return [];
  const tipoLower = tipo.toLowerCase().trim();
  const exactas = TALLAS_CONFIG[tipoLower];
  if (exactas) return exactas;
  for (const grupo of COINCIDENCIAS) {
    for (const palabra of grupo.palabras) {
      if (tipoLower.includes(palabra)) {
        return TALLAS_CONFIG[grupo.categoria] ?? [];
      }
    }
  }
  return [];
}

export function getDisplayName(tipo: string, talla?: string): string {
  const nombre = tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase();
  return talla ? `${nombre} - ${talla}` : nombre;
}
