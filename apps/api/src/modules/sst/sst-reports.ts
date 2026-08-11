import { SstInspection } from './entities/sst-inspection.entity';
import { SstValoracion } from './entities/sst-response.entity';

function pad(s: string, n: number): string {
  const t = (s ?? '').slice(0, n);
  return t + ' '.repeat(Math.max(0, n - t.length));
}

export function buildMarkdownReport(insp: SstInspection): string {
  const w = insp.workplace;
  const c = w?.client;
  const respuestas = insp.respuestas ?? [];
  const cats = new Map<string, typeof respuestas>();
  for (const r of respuestas) {
    const cat = r.item?.categoria ?? 'Otros';
    if (!cats.has(cat)) cats.set(cat, []);
    cats.get(cat)!.push(r);
  }

  const seguro = respuestas.filter((r) => r.valoracion === SstValoracion.SEGURO).length;
  const riesgoso = respuestas.filter((r) => r.valoracion === SstValoracion.RIESGOSO).length;
  const na = respuestas.filter((r) => r.valoracion === SstValoracion.N_A).length;
  const planesAbiertos = respuestas.filter(
    (r) => r.estadoPlanAccion && r.estadoPlanAccion !== 'CERRADO',
  ).length;
  const reincidentes = respuestas.filter((r) => (r.reincidenciaCount ?? 0) >= 3).length;

  let md = `# Informe de Inspección de Puesto de Trabajo (IPT)

**Puesto de trabajo:** ${w?.nombre ?? '—'}
**Cliente:** ${c?.nombre ?? '—'}
**Dirección:** ${w?.direccion ?? '—'}
**Fecha de inspección:** ${insp.fecha}
**Tipo:** ${insp.tipo}
**Responsable:** ${insp.responsableNombre} — ${insp.responsableCargo}

---

## 1. Resumen ejecutivo

| Indicador | Valor |
|---|---|
| % Cumplimiento global | ${insp.cumplimientoGlobal ?? '—'}% |
| Nivel de riesgo | ${insp.nivelRiesgo ?? '—'} |
| Ítems evaluados | ${seguro + riesgoso} |
| Ítems SEGURO | ${seguro} |
| Ítems RIESGOSO | ${riesgoso} |
| Ítems N/A | ${na} |
| Planes de acción abiertos | ${planesAbiertos} |
| Ítems reincidentes (≥3) | ${reincidentes} |

## 2. Resultados por categoría

| Categoría | Seguro | Riesgoso | N/A | % Cumplimiento |
|---|---|---|---|---|
`;

  let i = 0;
  for (const [cat, items] of cats) {
    i++;
    const s = items.filter((r) => r.valoracion === SstValoracion.SEGURO).length;
    const risk = items.filter((r) => r.valoracion === SstValoracion.RIESGOSO).length;
    const n = items.filter((r) => r.valoracion === SstValoracion.N_A).length;
    const den = s + risk;
    const pct = den ? Math.round((s / den) * 10000) / 100 : '—';
    md += `| ${cat} | ${s} | ${risk} | ${n} | ${pct}% |\n`;
  }

  md += `\n## 3. Hallazgos y planes de acción\n`;
  i = 0;
  for (const [cat, items] of cats) {
    i++;
    md += `\n### 3.${i} ${cat}\n`;
    const hallazgos = items.filter((r) => r.valoracion === SstValoracion.RIESGOSO);
    if (!hallazgos.length) {
      md += `*Sin hallazgos en esta categoría.*\n`;
      continue;
    }
    for (const h of hallazgos) {
      const foto = h.evidencias?.[0]?.urlArchivo;
      md += `
- **Ítem:** ${h.item?.pregunta ?? h.itemId}
  **Valoración:** RIESGOSO
  **Hallazgo:** ${h.hallazgo ?? '—'}
  **Evidencia fotográfica:** ${foto ? `![evidencia](${foto})` : '—'}
  **Plan de acción propuesto:** ${h.planAccionPropuesto ?? '—'}
  **Responsable / fecha compromiso:** ${h.responsablePlanAccion ?? '—'} — ${h.fechaCompromiso ?? '—'}
  **Estado:** ${h.estadoPlanAccion ?? '—'} (Reincidente #${h.reincidenciaCount ?? 0})
`;
    }
  }

  if (insp.tipo === 'SEGUIMIENTO') {
    md += `\n## 4. Comparativo de seguimiento\n\n| Ítem | Valoración anterior | Valoración actual | Estado |\n|---|---|---|---|\n`;
    for (const r of respuestas) {
      if (!r.valoracionAnterior && r.valoracionAnterior !== SstValoracion.SEGURO) continue;
      const label =
        r.valoracionAnterior === SstValoracion.RIESGOSO && r.valoracion === SstValoracion.SEGURO
          ? 'Cerrado'
          : r.valoracionAnterior === SstValoracion.RIESGOSO &&
              r.valoracion === SstValoracion.RIESGOSO
            ? 'Reincidente'
            : '—';
      md += `| ${(r.item?.pregunta ?? '').slice(0, 60)} | ${r.valoracionAnterior ?? '—'} | ${r.valoracion ?? '—'} | ${label} |\n`;
    }
  }

  md += `\n## 5. Observaciones generales\n\n${insp.observacionesGenerales ?? '—'}\n`;
  md += `\n## 6. Firmas\n\n**Inspector:** ${insp.responsableNombre} ______________________\n`;
  md += `**Recibido por (puesto/cliente):** ______________________  **Fecha:** ${insp.fecha}\n`;
  return md;
}

export function buildAsciiReport(insp: SstInspection): string {
  const w = insp.workplace;
  const c = w?.client;
  const respuestas = insp.respuestas ?? [];
  const seguro = respuestas.filter((r) => r.valoracion === SstValoracion.SEGURO).length;
  const riesgoso = respuestas.filter((r) => r.valoracion === SstValoracion.RIESGOSO).length;
  const na = respuestas.filter((r) => r.valoracion === SstValoracion.N_A).length;
  const planesAbiertos = respuestas.filter(
    (r) => r.estadoPlanAccion && r.estadoPlanAccion !== 'CERRADO',
  ).length;
  const reincidentes = respuestas.filter((r) => (r.reincidenciaCount ?? 0) >= 3).length;

  let t = '';
  t += '================================================================================\n';
  t += '                INFORME DE INSPECCION DE PUESTO DE TRABAJO (IPT)\n';
  t += '================================================================================\n';
  t += `Puesto de trabajo : ${w?.nombre ?? '—'}\n`;
  t += `Cliente            : ${c?.nombre ?? '—'}\n`;
  t += `Direccion          : ${w?.direccion ?? '—'}\n`;
  t += `Fecha inspeccion   : ${insp.fecha}\n`;
  t += `Tipo               : ${insp.tipo}\n`;
  t += `Responsable        : ${insp.responsableNombre} (${insp.responsableCargo})\n`;
  t += '--------------------------------------------------------------------------------\n';
  t += '1. RESUMEN EJECUTIVO\n';
  t += '--------------------------------------------------------------------------------\n';
  t += ` % Cumplimiento global .......... ${insp.cumplimientoGlobal ?? '—'} %\n`;
  t += ` Nivel de riesgo ................ ${insp.nivelRiesgo ?? '—'}\n`;
  t += ` Items SEGURO ................... ${seguro}\n`;
  t += ` Items RIESGOSO ................. ${riesgoso}\n`;
  t += ` Items N/A ...................... ${na}\n`;
  t += ` Planes abiertos ................ ${planesAbiertos}\n`;
  t += ` Items reincidentes ............. ${reincidentes}\n`;
  t += '--------------------------------------------------------------------------------\n';
  t += '3. HALLAZGOS Y PLANES DE ACCION\n';
  t += '--------------------------------------------------------------------------------\n';
  for (const h of respuestas.filter((r) => r.valoracion === SstValoracion.RIESGOSO)) {
    t += ` > Item        : ${h.item?.pregunta ?? h.itemId}\n`;
    t += `   Hallazgo    : ${h.hallazgo ?? '—'}\n`;
    t += `   Plan accion : ${h.planAccionPropuesto ?? '—'}\n`;
    t += `   Responsable : ${h.responsablePlanAccion ?? '—'}   Fecha: ${h.fechaCompromiso ?? '—'}\n`;
    t += `   Estado      : ${h.estadoPlanAccion ?? '—'} (#${h.reincidenciaCount ?? 0})\n`;
    t += ' --------------------------------------------------------------------------\n';
  }
  t += '5. OBSERVACIONES\n';
  t += `${insp.observacionesGenerales ?? '—'}\n`;
  t += '6. FIRMAS\n';
  t += ` Inspector : ${insp.responsableNombre}   Firma: ____________________\n`;
  t += ` Recibido  : ___________________________   Fecha: ${insp.fecha}\n`;
  t += '================================================================================\n';
  return t;
}

// silence unused in some bundlers
void pad;
