import {
  PostContractItemDto,
  PostOtrosiItemDto,
} from './dto/post-agreements.dto';

export function blank(v?: string | null): string | null {
  const t = v?.trim();
  return t ? t : null;
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
