# Diseño — Programación: panel de alertas + colores en tablero

**Fecha:** 2026-08-20  
**Estado:** Aprobado (JHON) · Plan listo  
**Enfoque:** Motor de alertas en API (cálculo al vuelo) + panel con pestañas + colores en tablero + popups al asignar

## Decisiones

| Tema | Decisión |
|------|----------|
| Cobertura | Cada puesto, cada día: **D + N** (12 h). Meta ~60 turnos (mes 30) / ~62 (mes 31). D8/N8 son excepción, no meta de cobertura |
| Prioridad mes | Siempre mes **actual** primero. Huecos del **mes siguiente** solo desde el **día 20** del mes en curso |
| Carga >24 | Contar solo turnos **12 h (D/N)** en **cualquier puesto** (relevante multi-puesto). D8/N8 no cuentan. **Avisa, no bloquea** |
| Inactivo | Notificar inactivo **y** hueco a cubrir. Programación reasigna a mano. Sistema **no** limpia celdas solo |
| Asignar inactivo | Popup → si confirman, se guarda + alerta |
| Conflicto (doble puesto) | Mismo asociado, mismo día, mismo turno D/N en otro puesto. Popup antes de asignar → si confirman, se guarda + alerta legible (“…en el puesto X”) |
| UI | **Ambos:** pantalla Alertas (pestañas) **y** colores en tablero |
| Persistencia | Sin tabla de alertas: se calculan al consultar / al validar asignación |
| Quién ve | `scheduling.view` (incluye cuenta **auditor** para gerente y director operativo): ven todo en lectura |
| Quién edita | `scheduling.edit` (Programación): asigna, confirma popups, corrige huecos |

## Tipos de alerta (pestañas)

| Pestaña | Código | Severidad | Mensaje orientativo |
|---------|--------|-----------|---------------------|
| Huecos | `hueco_cobertura` | error | Puesto X · día N · falta D / falta N |
| Inactivos | `asociado_inactivo` | error | Asociado Y (estado Z) programado en puesto X · día N · turno T — hay que cubrir el puesto |
| Conflictos | `conflicto_mismo_turno` | error | Asociado Y ya está en puesto X el mismo día/turno; también en puesto W |
| Carga | `carga_sobre_24` | warning | Asociado Y: N turnos D/N en el mes (tope orientativo 24) |

**Inactivo** = `associates.status !== ACTIVO` (INACTIVO, SUSPENDIDO, VACACIONES, RETIRADO). Si más adelante hay “incapacidad” como estado/flag, entra en la misma pestaña.

## Arquitectura

```
[Tablero / Matriz] --asignar--> popup (inactivo | conflicto) --OK--> save
       |                                              |
       v                                              v
  colores por celda                         GET /scheduling/monthly/alerts
       ^                                              |
       +-------------- mismos códigos ----------------+
                                                      |
[Pantalla Alertas] <--- tabs + lista <-----------------+
[Auditor solo view]
```

- Reutilizar y ampliar la idea de `MotorTurnosService.validateBoard` (hoy `cobertura_rota` por puesto) a un **calculador multi-puesto** del mes.
- Un endpoint agrega alertas de todos los puestos del mes (y del mes siguiente si día ≥ 20).
- El tablero pide alertas del `postId` + mes (o recibe un mapa cellKey → severidad) para pintar sin duplicar reglas en el front.

## API

- `GET /api/v1/scheduling/monthly/alerts?month=YYYY-MM&scope=current|next|auto`
  - `auto`: mes pedido + si hoy ≥ día 20 y `month` es el actual, incluir también mes siguiente (o documentar query `includeNext=true`).
  - Permiso: `scheduling.view`
  - Respuesta: `{ month, generatedAt, totals: { huecos, inactivos, conflictos, carga }, alerts: AlertItem[] }`
- `AlertItem`: `{ id, type, severity, month, day?, postId, postName, associateId?, associateName?, shift?, otherPostId?, otherPostName?, message }`
- Opcional ligero para tablero: `GET .../alerts/board?postId=&month=` → solo keys de celda con color (evitar payload enorme en el panel global).
- Al **guardar** celda (`scheduling.edit`): si hay conflicto o inactivo, el body puede traer `confirmWarnings: true`; si no, API responde `409`/`400` con lista de warnings para que el front muestre el popup. Si `confirmWarnings`, guarda igual y las alertas siguen apareciendo en el panel.

## UI

### Nav Programación

- Panel | Matriz multi-puesto | Cuadro mensual | **Alertas** (`/programacion/alertas`, `scheduling.view`)

### Pantalla Alertas

- Selector de mes (default: actual).
- Badge de totales; pestañas: Huecos | Inactivos | Conflictos | Carga.
- Lista legible; click → navegar al cuadro/matriz del puesto/día si aplica.
- Auditor / gerente / director: misma pantalla, sin botones de edición.

### Tablero (cuadro / matriz)

| Color | Uso |
|-------|-----|
| Rojo / error | Hueco (falta D o N) |
| Ámbar | Inactivo o conflicto en esa celda |
| Morado / warning suave | Carga >24 del asociado (opcional en celda; detalle en pestaña Carga) |

- Tooltip o chip con el mensaje corto.
- Popup al asignar (solo `scheduling.edit`): texto claro + Cancelar / Programar igual.

## Flujo operativo

1. Asociado pasa a no-ACTIVO → aparece en **Inactivos** y el día/turno queda como **Hueco** a cubrir (la celda puede seguir mostrando el nombre hasta que Programación reemplace).
2. Programación busca disponible, asigna; si el candidato ya está en otro puesto mismo día/turno → popup → confirma o cancela.
3. Auditor abre Alertas y ve el mismo listado (control gerencial / dirección operativa).

## Fuera de alcance (esta entrega)

- Auto-reasignación / sugerir candidato automático
- Tabla persistente de alertas o historial de “alertas cerradas”
- Push/email/WhatsApp
- Bloquear guardar por carga >24 o por conflicto (solo aviso + confirmación)
- Cambiar reglas del motor de generación de turnos (solo alertas sobre el tablero existente)

## Pruebas mínimas (API)

- Hueco: día sin D o sin N → `hueco_cobertura`
- Asociado VACACIONES en celda → `asociado_inactivo` (+ hueco conceptual a cubrir)
- Mismo associateId en dos posts, mismo day + código D/N → `conflicto_mismo_turno` con `otherPostName`
- 25 celdas D/N del mismo associate en el mes (varios posts) → `carga_sobre_24`; D8 no suma
- Día 19: no exigir alertas de mes siguiente; día 20+: sí cuando `scope=auto`
- Usuario solo `scheduling.view` puede GET alerts; sin `edit` no confirma asignación
