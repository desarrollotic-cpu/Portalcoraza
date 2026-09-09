import {
  PostContractItemDto,
  PostOtrosiItemDto,
} from './dto/post-agreements.dto';

export function blank(v?: string | null): string | null {
  const t = v?.trim();
  return t ? t : null;
}

/**
 * Excel guarda enteros como 1146.0. Solo recorta si el valor ENTERO es dígitos + .0/.00.
 * No toca 800.1, 12.05, 857-1 ni texto. No usa Number() (perdería ceros a la izquierda).
 */
export function stripExcelId(v?: string | null): string | null {
  const t = blank(v);
  if (!t) return null;
  return /^\d+\.0+$/.test(t) ? t.replace(/\.0+$/, '') : t;
}

export function contractEmpty(c: PostContractItemDto): boolean {
  return (
    !blank(c.contractNumber) &&
    !blank(c.contractStart) &&
    !blank(c.contractTerm) &&
    !blank(c.contractEnd) &&
    !blank(c.basc) &&
    !blank(c.serviceType) &&
    !blank(c.invoiceValue) &&
    !c.armed
  );
}

export function otrosiEmpty(o: PostOtrosiItemDto): boolean {
  return (
    !blank(o.number) &&
    !blank(o.typeText) &&
    !blank(o.dateText) &&
    !blank(o.term) &&
    !blank(o.dateEnd) &&
    !blank(o.invoiceValue) &&
    !blank(o.serviceType)
  );
}
