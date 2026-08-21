# Diseño — PDF Minuta Operaciones (formato SuperVigilancia)

**Fecha:** 2026-08-21  
**Estado:** Aprobado (JHON) · En implementación  
**Alcance:** Solo `GET /minuta/operaciones/pdf` (pdfkit). Sin cambio de UI salvo el archivo generado.

## Decisiones

| Tema | Decisión |
|------|----------|
| Enfoque | Reformar PDF actual (pdfkit) |
| Encabezado | Nombre del **puesto** + mes/período + título “MINUTA DE PUESTO” |
| Cuerpo | Anotaciones **numeradas** 1…N, **cronológico** (más antigua primero), **todos los detalles** del registro |
| Pie (cada página) | Carrera 81 No. 49-24 · PBX 444 79 29 · Tel. 234 79 29 · Medellín - Antioquia · contacto@corazaseguridadcta.com · corazaseguridad@une.net.co · www.corazaseguridad.com · **VIGILADO** SuperVigilancia Resolución **6889** del 29 de septiembre de 2011 |
| Logo | Fuera de esta entrega (solo texto) |

## Fuera de alcance

- Firmas manuscritas / casillas de firma
- PDF desde cuenta PUESTO
- Plantilla Word
