# Brief para presentación — Avances Portal Coraza

**Fecha de corte:** 2026-08-20  
**Audiencia sugerida:** dirección / operaciones / TIC  
**Duración sugerida:** 20–30 min + demo  
**URLs producción:**  
- Web: https://portalcoraza-web.onrender.com  
- API: https://portalcoraza.onrender.com  

**Uso:** pegar este documento completo a otra IA para que genere diapositivas (PowerPoint / Google Slides / Canva). Pedirle diseño corporativo azul Coraza, pocas viñetas por slide, y slides de demo al final.

---

## 1. Mensaje central (elevator pitch)

Portal Coraza es el **ERP interno** de Coraza Seguridad C.T.A.: una sola plataforma web donde RRHH, operaciones, dotación, programación, recepción, minuta, documental y administración trabajan con **los mismos datos**, **permisos por rol** y **auditoría**.

Ya está **en producción** (Render + Supabase). En las últimas semanas se consolidó el **dashboard operativo**, se organizó **Minuta Virtual** (puesto + operaciones), se retiró lo que no aportaba (app Vigilante / residencial legado) y se dejó lista la base para **entregas de dotación con firma digital**.

---

## 2. Estructura sugerida de la presentación (slides)

### Bloque A — Contexto (3–4 slides)
1. Portada  
2. El problema que resolvemos  
3. Qué es Portal Coraza (visión)  
4. Dónde estamos hoy (producción + stack)

### Bloque B — Módulos listos (8–10 slides)
5. Mapa de módulos  
6. RRHH / Gestión Humana  
7. Operaciones y puestos  
8. Programación de turnos  
9. Dotación e inventario  
10. Recepción  
11. Minuta Virtual (puesto)  
12. Minuta para Operaciones (supervisión + PDF)  
13. Documental / SIG / Contabilidad-Nómina (según profundidad deseada)  
14. Administración (usuarios, roles, permisos)

### Bloque C — Avances recientes (3–4 slides)
15. Dashboard Command Center  
16. Decisiones de producto (qué se retiró y por qué)  
17. Infraestructura y capacidad actual  
18. Roadmap inmediato (dotación firmas en uso real, estabilidad Render/Supabase)

### Bloque D — Cierre (2–3 slides)
19. Demo en vivo (guion)  
20. Beneficios para la empresa  
21. Próximos pasos y petición a dirección (si aplica: plan pago infra ~$50/mes)

---

## 3. Contenido por slide (texto listo para diapositivas)

### Slide 1 — Portada
- **Título:** Portal Coraza — Avances del sistema  
- **Subtítulo:** Plataforma integral de gestión operativa y administrativa  
- **Fecha:** agosto 2026  
- **Presenta:** [JHON / área TIC]

### Slide 2 — El problema
- Información dispersa entre Excel, apps antiguas y procesos manuales  
- Difícil ver el estado operativo del día en un solo lugar  
- Riesgo de inconsistencia: personal, turnos, dotación y bitácoras no hablaban entre sí  
- Necesidad de control por rol (quién ve qué) y trazabilidad

### Slide 3 — La solución
- **Un solo portal** con login corporativo  
- Módulos conectados a **una base de datos** (PostgreSQL / Supabase)  
- **RRHH = fuente de verdad** del personal  
- Permisos granulares (RBAC)  
- Acceso desde navegador, sin instalar software de escritorio

### Slide 4 — Estado actual
- **En producción** y en uso de desarrollo/pruebas operativas  
- Stack: Angular (web) + NestJS (API) + Supabase (Postgres + Storage) + Render (hosting)  
- ~**4.500 asociados**, **226 puestos**, recepción y programación activos  
- Base de datos ~**34 MB** de 500 MB del plan free (holgada)  
- Infra recomendada a mediano plazo: Render Standard + Supabase Pro (~USD 50/mes)

### Slide 5 — Mapa de módulos (diagrama)
Listar cajas/iconos:
- Dashboard  
- Gestión Humana (RRHH)  
- Operaciones (puestos)  
- Programación  
- Dotación  
- Recepción  
- Minuta Virtual  
- Documental  
- SIG  
- Contabilidad & Nómina  
- Administración  

Nota para el diseñador: flecha “permisos → cada módulo muestra solo lo autorizado”.

### Slide 6 — Gestión Humana
- Directorio de asociados con paginación y filtros (ej. nivel educativo)  
- Cargos, centros de trabajo, catálogos  
- Ausentismo + diagnósticos CIE-10  
- Retiros / reingresos  
- Alertas de RRHH  
- Importación Excel (capacidad existente en módulo)  
- **Todo nativo en el portal** (ya no depende de la app externa de GH)

### Slide 7 — Operaciones
- Catálogo de **puestos de trabajo** (activos alimentan Programación y Dotación)  
- Campos operativos del puesto  
- Nuevo: **Minutas** dentro de Operaciones  
  - Consulta de novedades de **todos** los puestos  
  - Filtro obligatorio **puesto + mes**  
  - **Descarga PDF** del mes (Director / Operaciones)

### Slide 8 — Programación
- Cuadro mensual por puesto  
- Motor de turnos  
- Códigos de turno incluyendo jornadas de 8 h (**D8 / N8**)  
- Mejoras de rendimiento en lecturas  
- Uso intensivo previsto: ~14 h/día × 6 días (módulo crítico operativo)

### Slide 9 — Dotación
- Inventario de elementos y variantes  
- Stock por **almacén** (Medellín / Rionegro) con traslados  
- Agregar stock con **talla y género**  
- Entregas a asociados  
- **Firma digital** al confirmar: código listo; bucket `delivery-signatures` configurado en Supabase  
- Listo para uso real de formas/firmas de entrega

### Slide 10 — Recepción
- Registro de visitantes / asociados por documento  
- Historial y salida  
- Generación de **PDF** de historial por rango de fechas  
- Uso diario prolongado (~10 h)

### Slide 11 — Minuta Virtual (cuenta de puesto)
- Bitácora operativa del puesto (visitantes, correspondencia, contratistas, domiciliarios, incidentes, servicio, entrega de puesto)  
- Cuenta **compartida del puesto** (no del vigilante individual)  
- Obligatorio: **nombre del vigilante que registra**  
- Fecha/hora del sistema; **no se edita** el reporte después de crear  
- Historial del puesto **sin descarga PDF** (la descarga es de Operaciones)  
- Rutas organizadas: Inicio / Nuevo / Historial

### Slide 12 — Dashboard (Command Center)
- Home inteligente según **permisos** del usuario  
- Vista de indicadores de varios módulos  
- Periodos (hoy / 7d / 30d / mes), sparklines, cobertura del día, próximo turno  
- Actividad reciente (auditoría) con etiquetas legibles  
- Objetivo: dirección y jefaturas ven el pulso operativo al entrar

### Slide 13 — Administración y seguridad
- Usuarios, roles y permisos  
- Asignación de puestos a cuentas tipo PUESTO  
- JWT + refresh; permisos efectivos en login/refresh  
- Auditoría de acciones sensibles  
- Modo oscuro global en portal

### Slide 14 — Decisiones importantes de producto
- **Retirado Residencial** del alcance actual (simplificación)  
- **Retirado módulo Vigilante / Coraza Vigía** (app paralela); la operación de campo queda en Minuta Virtual del portal  
- Unificación financiera: Contabilidad & Nómina  
- Enfoque en módulos de valor diario: programación, recepción, RRHH, dotación, minuta, operaciones

### Slide 15 — Infraestructura (transparencia)
- Hoy: planes free (Render + Supabase) — funcionales para etapa actual  
- Capacidad: BD ~7% del cupo free; 7 usuarios concurrentes razonables  
- Riesgos free: cold start Render, pausa por inactividad Supabase, sin backups diarios  
- Recomendación TIC: **Render Standard + Supabase Pro ≈ USD 50/mes** para operación estable a largo plazo

### Slide 16 — Beneficios para la empresa
- Una sola fuente de verdad del personal y la operación  
- Menos Excel sueltos y menos “versiones” de la verdad  
- Supervisión de minutas por Operaciones con PDF mensual  
- Dotación con evidencia de firma  
- Visibilidad gerencial en el dashboard  
- Base lista para crecer módulos sin cambiar de plataforma

### Slide 17 — Próximos pasos (roadmap corto)
1. Uso real de **entregas de dotación con firma** en campo/oficina  
2. Adopción plena de **Minuta** por puestos + revisión semanal desde Operaciones  
3. Ajuste de infra pagada si la dirección aprueba (estabilidad 14 h/día)  
4. Mejoras de UX según feedback de usuarios reales  
5. (Opcional) reportes gerenciales adicionales sobre el Command Center

### Slide 18 — Cierre / llamada a la acción
- Portal Coraza **ya está vivo en producción**  
- Pedido: validar prioridades de adopción (quién usa qué primero)  
- Pedido (si aplica): presupuesto infra ~USD 50/mes  
- Contacto TIC / demo permanente en URL de producción

---

## 4. Guion de demo en vivo (5–8 min)

Orden sugerido (con usuario GERENCIA o roles reales):

1. **Login** → branding Coraza  
2. **Dashboard** → indicadores y actividad  
3. **RRHH** → buscar un asociado  
4. **Operaciones → Puestos** → mostrar catálogo  
5. **Programación** → abrir un cuadro (sin demorarse en editar)  
6. **Recepción** → listado / concepto de visita  
7. **Minuta** (si hay cuenta PUESTO) → Inicio / Nuevo (mostrar campo vigilante)  
8. **Operaciones → Minutas** → puesto + mes → Consultar / PDF  
9. **Dotación** → inventario / almacenes; mencionar firma lista  
10. Cerrar en **Administración** (roles) solo si hay tiempo

Mensajes clave mientras demuestras:
- “Lo que ve cada usuario depende de su rol.”  
- “Operaciones supervisa; el puesto registra.”  
- “La firma de dotación ya tiene bucket y flujo listos.”

---

## 5. Cifras útiles para la presentación

| Dato | Valor aprox. (ago-2026) |
|------|-------------------------|
| Asociados en sistema | ~4.590 |
| Puestos | ~226 |
| Visitas recepción registradas | ~265 |
| Tamaño BD | ~34 MB / 500 MB free |
| Usuarios portal | ~10 (crecerán con roles reales) |
| Concurrentes esperados | ~7 |
| Uso Programación | ~14 h/día × 6 días |
| Uso Recepción | ~10 h/día |
| Hosting web | portalcoraza-web.onrender.com |
| Hosting API | portalcoraza.onrender.com |

---

## 6. Avances recientes (para slide “¿Qué hubo de nuevo?”)

- Dashboard Command Center (fases 1–2) + correcciones de build producción  
- Retiro del módulo Vigilante (Coraza Vigía)  
- Operaciones: submódulo Minutas con PDF por puesto/mes  
- Minuta Virtual reorganizada (Inicio / Nuevo / Historial) + vigilante obligatorio + reportes inmutables  
- Dotación: almacenes, stock con talla/género, firma en Storage lista  
- Programación: D8/N8 y mejoras de motor/rendimiento  
- Recepción: mejoras UX, PDF historial, etiqueta asociado/visitante  
- Contabilidad PUC + nómina (colillas) unificados en menú financiero  

---

## 7. Lo que NO decir / matices honestos

- Residencial **no** está en el producto actual (se retiró a propósito).  
- App Vigilante **ya no** forma parte del portal.  
- Minuta en puestos: hay que capacitar el uso del campo “vigilante que registra”.  
- Firmas de dotación: infraestructura lista; el volumen de uso real empieza ahora.  
- Free hosting aguanta la etapa actual; para 14 h diarias estables se recomienda plan pago.

---

## 8. Instrucciones para la IA que diseñará las diapositivas

Por favor genera una presentación profesional con:

1. Paleta corporativa azul / índigo Coraza (evitar morados genéricos de IA).  
2. Máximo 5 viñetas por slide.  
3. Incluir 1 diagrama de arquitectura simple (Usuario → Web Angular → API Nest → Supabase).  
4. Incluir 1 diagrama de roles: Puesto registra / Operaciones supervisa y descarga.  
5. Incluir slide de demo con checklist.  
6. Incluir slide de costos infra opcional (Free vs ~USD 50/mes recomendado).  
7. Tonos: formal, claro, orientado a decisión de negocio (no jerga excesiva de desarrolladores).  
8. Idioma: español (Colombia).  
9. Formato de salida: [PowerPoint / Google Slides / outline Markdown según lo que pida JHON].

---

## 9. Frases cortas para cerrar cada bloque

- “Un portal. Una verdad. Toda la operación.”  
- “El puesto registra. Operaciones valida.”  
- “La firma de dotación ya no es papel suelto: queda en el sistema.”  
- “El dashboard no es decoración: es el tablero del día.”  
- “Estamos en producción; ahora toca adopción y estabilidad.”

---

*Fin del brief. Actualizar cifras si la presentación se da semanas después.*

---

## 10. Prompt listo para pegar a la IA de diseño

```
Actúa como diseñador de presentaciones corporativas para una empresa de seguridad privada en Colombia (Coraza Seguridad C.T.A.).

Te adjunto el brief completo "PRESENTACION-AVANCES-2026-08.md". Úsalo como ÚNICA fuente de verdad del contenido. No inventes módulos que el brief diga que se retiraron (Residencial, app Vigilante).

Entrega:
1) Presentación en español (Colombia), tono formal y claro para dirección/operaciones/TIC.
2) 18–21 diapositivas siguiendo la estructura del brief (bloques A–D).
3) Máximo 5 viñetas por slide; títulos cortos.
4) Paleta corporativa azul/índigo Coraza. Evita temas morados genéricos, cream+terracota o estilo “AI default”.
5) Incluye estos 3 visuales:
   - Diagrama: Usuario → Web Angular → API NestJS → Supabase
   - Diagrama: Puesto registra / Operaciones supervisa y descarga PDF
   - Checklist de demo en vivo
6) Incluye slide de costos infra: Free vs recomendado ~USD 50/mes (Render Standard + Supabase Pro).
7) Incluye slide de cifras del brief (asociados, puestos, URLs).
8) Al final, una página “Notas del presentador” con el guion de demo del brief (5–8 min).

Formato de salida preferido: PowerPoint (.pptx) o, si no puedes, Google Slides outline / Markdown por slide listo para copiar.

Nombre del archivo sugerido: Portal-Coraza-Avances-2026-08.pptx
```
