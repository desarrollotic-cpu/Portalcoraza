# Acta de entrega del cargo — Gestión Documental / Documental

> Coraza Seguridad C.T.A. — Portal Portalcoraza
> Documento operativo de traspaso del cargo de **Documental** a la persona que asume la responsabilidad del módulo.

---

## 1. Datos de la entrega

| Campo | Valor |
|---|---|
| Fecha de entrega | ______ / ______ / ________ |
| Cargo | Documental / Gestión Documental |
| Área | Administración — Coraza Seguridad C.T.A. |
| Persona que entrega | _______________________________________ (C.C. ____________________) |
| Persona que recibe | _______________________________________ (C.C. ____________________) |
| Testigo / Jefe inmediato | _______________________________________ |
| Versión del portal a la fecha | Ver `apps/web/src/index.html` → comentario `<!-- deploy: ... -->` |

---

## 2. Alcance del cargo

El cargo Documental es responsable de la operación diaria del **Sistema de Gestión Documental (SGD)** de Coraza en el portal Portalcoraza, cubriendo:

- Correspondencia recibida y despachada.
- Minutas físicas del archivo central.
- Contratos de vigilancia (clientes / copropiedades).
- Custodia de hojas de vida de asociados retirados.
- Préstamos y devoluciones del archivo físico (internos y externos).
- Biblioteca digital y archivo VOXELSERA (ubicación física de las cajas).
- Buscador universal y generación de informes.
- Impresión y reimpresión de rótulos térmicos (Niimbot B1).
- Correo institucional documental y flujos de trabajo (workflows).
- Cumplimiento de las TRD (Tablas de Retención Documental) y de la Superintendencia de Vigilancia.

---

## 3. Accesos, credenciales y correos

### 3.1 Portal web

| Recurso | URL | Notas |
|---|---|---|
| Portal principal | `https://portalcoraza-web.onrender.com` (o dominio actual configurado en Render) | Login con correo institucional. |
| Módulo Gestión Documental | `/documental` | Ruta directa una vez autenticado. |
| Minuta Virtual (puestos) | `https://portalcoraza-minuta.onrender.com` | Uso operativo de vigilantes; no confundir con "Minutas" del archivo físico. |

### 3.2 Correo institucional documental

- **Cuenta oficial:** `documental@corazaseguridadcta.com` (Google Workspace).
- SMTP saliente configurado en el API (`SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`).
- La contraseña de aplicación vive **solo** en las variables de entorno del servicio API en Render (`SMTP_USER`, `SMTP_PASS`). **Nunca** se comparte por chat ni se copia a repositorios.
- Este correo lo usa el sistema para:
  - Notificar aprobaciones/rechazos de préstamos externos.
  - Enviar acuses de recibo del portal público de préstamos.
  - Comunicar workflows del área.

### 3.3 Roles y permisos en el portal

El menú de Documental se controla por dos permisos:

| Permiso | Qué habilita |
|---|---|
| `documental.view` | Ve el panel completo, crea, edita y consulta correspondencia, minutas, contratos, biblioteca, informes, retirados, buscador y VOXELSERA. |
| `documental.loans` | Habilita **Préstamos** de forma independiente (para roles operativos que solo prestan/devuelven sin ver todo el resto). |

- El rol típico para el cargo es **Documental** (perfil con ambos permisos).
- Consultar / ajustar roles: Portal → **Administración → Usuarios y Roles**.
- La creación de usuarios y la asignación de permisos la hace **Gerencia / Administración**, no Documental.

### 3.4 Impresora y equipos físicos

| Equipo | Serial / referencia | Ubicación | Observaciones |
|---|---|---|---|
| Impresora térmica Niimbot B1 (Bluetooth) | _______________________________________ | Escritorio Documental | Rollo **80 mm**. Reponer con cinta original. |
| Escáner (si aplica) | _______________________________________ | Escritorio Documental | Configurado a PDF/A en la carpeta compartida. |
| PC del cargo | _______________________________________ | Oficina Documental | Chrome + Edge actualizados (Bluetooth Web habilitado). |

---

## 4. Estructura del módulo en el portal

Menú lateral del módulo `/documental` (en este orden):

1. **Panel** (`/documental`) — Dashboard con KPIs de correspondencia pendiente, minutas del mes, préstamos vencidos, contratos por vencer.
2. **Correspondencia** (`/documental/correspondencia`) — Registro de correspondencia recibida y despachada.
3. **Minutas** (`/documental/minutas`) — Minutas físicas archivadas (no confundir con Minuta Virtual de vigilantes).
4. **Asociados Retirados** (`/documental/asociados`) — Custodia de hojas de vida de exempleados.
5. **Contratos** (`/documental/contratos`) — Contratos de vigilancia con clientes y copropiedades.
6. **Préstamos** (`/documental/prestamos`) — Salidas y devoluciones del archivo físico, internos y externos.
7. **Biblioteca** (`/documental/biblioteca`) — Carpetas y archivos digitales institucionales.
8. **VOXELSERA** (`/documental/voxelsera`) — Mapa físico de estantería: en qué caja / estante está cada expediente.
9. **Buscador Universal** (`/documental/buscador`) — Búsqueda transversal por código, título, cédula, contrato, minuta, etc.
10. **Informes** (`/documental/informes`) — Reportes exportables (Excel/PDF) por rango de fechas.

En la barra superior del módulo hay un botón azul **"Cola de Tiras"** con un contador: es el **Centro de Impresión de Rótulos** (Niimbot B1). Se explica en la sección 6.

---

## 5. Descripción funcional por submódulo

### 5.1 Panel

- Lo primero que se abre al entrar al módulo.
- Indicadores: correspondencia sin gestionar, minutas del mes, préstamos vencidos, contratos por vencer.
- Sirve como control diario de tareas pendientes.
- Rutina: revisarlo al iniciar la jornada y al final del día.

### 5.2 Correspondencia

- Registrar cada pieza de correspondencia recibida o enviada con: fecha, remitente, destinatario, tipo de documento, folios, observaciones y anexos.
- Cada registro genera un **consecutivo automático** (SequenceService del sistema) que no se debe modificar manualmente.
- Al guardar, se puede enviar el rótulo a la cola de impresión con el botón **"Rótulo"**.
- Nunca eliminar registros: si hay error, editar y anotar la corrección en observaciones. La eliminación queda en auditoría.

### 5.3 Minutas (archivo físico)

- Inventario de **minutas físicas** que llegan al archivo central (encuadernadas o archivadas).
- Campos clave: código único, número correlativo, puesto/origen, fecha de inicio, fecha de cierre, ubicación física (VOXELSERA).
- Al registrar una minuta, el sistema puede guardar automáticamente su rótulo en la cola de impresión.
- **NO confundir** con la app "Minuta Virtual" que usan los vigilantes en puesto: esa vive en `portalcoraza-minuta.onrender.com` y su flujo es distinto.

### 5.4 Asociados Retirados

- Registro y custodia de las hojas de vida de asociados que ya no están activos.
- Campos: nombres, cédula, fecha de retiro, causa, caja/estante, folios entregados.
- Consultar antes de responder cualquier certificación laboral o requerimiento judicial de personal antiguo.
- Está integrado con el módulo **Gestión Humana**: los retiros formales aparecen aquí para custodiar la hoja de vida física.

### 5.5 Contratos

- Contratos vigentes y vencidos de vigilancia con clientes / copropiedades.
- Campos: cliente, número de contrato, fecha inicio, fecha fin, valor, estado, ubicación física.
- El sistema alerta en el Panel los que vencen en 30 / 60 / 90 días.
- Cuando llega una renovación / otrosí, se registra como nueva versión, **no** se sobrescribe la anterior.

### 5.6 Préstamos

**Es el flujo más sensible del cargo — cualquier documento que salga del archivo debe estar registrado.**

Flujo estándar:

1. Solicitante llena el préstamo (interno) o entra por el **portal público de préstamos** (externo, requiere autorización).
2. Documental valida quién puede retirar y por cuánto tiempo (`loan-term.ts` define los plazos por tipo de documento).
3. Se aprueba en el portal → el sistema envía correo desde `documental@corazaseguridadcta.com` al solicitante.
4. El documento sale con rótulo de préstamo.
5. Al devolver → marcar "Devuelto" en el sistema y verificar folios/estado.
6. Si vence sin devolver → el Panel lo muestra en rojo y se envía correo recordatorio.

**Regla dura:** no entregar ningún documento físico sin registro en `/documental/prestamos`. Si el sistema está caído, dejar el vale escrito y **transcribirlo apenas vuelva**.

### 5.7 Biblioteca

- Carpetas y archivos digitales (manuales, políticas, formatos, resoluciones, actas de comité).
- Estructura tipo árbol: carpeta padre → subcarpetas → archivos.
- Solo subir versiones definitivas. Los borradores no van aquí.

### 5.8 VOXELSERA (mapa físico)

- Diagrama / listado de la estantería del archivo: qué caja está en qué estante, qué contiene, quién es el responsable.
- **Este módulo es la fuente de verdad de la ubicación física**: si mueves una caja, se actualiza aquí de inmediato o se pierde la trazabilidad.
- Cuando llega un requerimiento (juzgado, auditoría, cliente), primero se busca en VOXELSERA la ubicación y luego se saca el documento físico.

### 5.9 Buscador Universal

- Un solo campo de búsqueda que consulta simultáneamente: correspondencia, minutas, contratos, retirados, biblioteca y préstamos.
- Sirve para "no sé dónde está esto pero sé el número/nombre/cédula".
- Búsqueda por: código único, nombre, cédula, número de contrato, folio.

### 5.10 Informes

- Reportes exportables:
  - Correspondencia por rango de fechas.
  - Préstamos vigentes / vencidos.
  - Contratos por vencer.
  - Minutas por mes / por puesto.
  - Retirados por período.
- Exporta a Excel/PDF. Se usa mensualmente para el informe de gestión de la Superintendencia y para Gerencia.

---

## 6. Impresión de rótulos — Niimbot B1 (regla dorada)

### 6.1 Regla dorada

> **NUNCA usar "Imprimir" del navegador (Ctrl+P) para los rótulos.**
> La Niimbot B1 imprime **por Bluetooth desde Chrome / Edge** con el botón azul de la barra superior del módulo. Si se imprime desde el navegador, la máquina saca todo el rollo en blanco (80 mm) y se pierde media caja de cinta.

### 6.2 Flujo diario

1. Cada vez que se registra un elemento (Minuta, Contrato, Correspondencia, Retirado) se puede pulsar el botón **"Rótulo"** y el rótulo se guarda en la **Cola de Tiras** (barra superior del módulo).
2. Al final del turno (o cuando la cola tenga varios elementos), abrir la cola → pestaña **"Cola Actual"** → **"Imprimir en Niimbot B1"**.
3. El sistema envía por Bluetooth el lote completo → la Niimbot imprime en una sola pasada, sin desperdicio.
4. El lote se archiva automáticamente en la pestaña **"Historial de Lotes"**.

### 6.3 Reimpresión

- Si un rótulo se dañó o se despegó: abrir la cola → pestaña **"Historial de Lotes"** → **"Reimprimir Lote"** (imprime el lote completo) o **"Restaurar a Cola"** (vuelve a cargarlo a la cola actual para editar antes de imprimir).

### 6.4 Requisitos técnicos del PC

- Chrome o Edge **actualizados** (soporte de Web Bluetooth).
- Bluetooth del PC encendido antes de imprimir.
- La primera vez, aparecerá un pop-up del navegador para "emparejar" la Niimbot. Aceptar y elegir la impresora.
- Si el navegador no encuentra la impresora: apagar/prender la Niimbot y volver a intentar.

---

## 7. Correo institucional documental

- Cuenta: `documental@corazaseguridadcta.com`.
- **Uso diario:**
  - Recibir solicitudes externas de préstamo.
  - Recibir correspondencia digital y digitalizarla en el módulo Correspondencia.
  - Enviar acuses de recibo formales.
  - Recibir automáticamente los correos disparados por el portal (aprobaciones de préstamos, recordatorios).
- **Uso automático (no manual):** el portal envía correos desde esta cuenta cuando aprueba préstamos, genera workflows o notifica devoluciones. No hay que hacer nada; simplemente **no borrar la contraseña de aplicación** ni cambiarla sin avisar al área de sistemas.
- **Backup del correo:** Google Workspace conserva histórico. Descargar mensualmente los mensajes importantes a la Biblioteca del portal.

---

## 8. Tablas de Retención Documental (TRD) y Superintendencia

- Las TRD (retenciones por tipo de documento) están cargadas en la tabla `retention_item` del sistema.
- Cada tipo de documento (`document_type`) tiene definido:
  - Tiempo en archivo de gestión.
  - Tiempo en archivo central.
  - Disposición final (conservación total / eliminación / selección).
- **Regla:** ningún documento se elimina físicamente sin acta firmada por Gerencia + Comité de Archivo.
- La numeración de las **Minutas Virtuales** de los puestos sigue la regulación de la **Superintendencia de Vigilancia**: folio cíclico **0 → 199** por puesto y tipo de minuta (Servicio / Visitantes / Correspondencia). Al llegar a 199, el siguiente registro reinicia en 0. Esto es normal y está automatizado por el sistema.

---

## 9. Rutina operativa

### 9.1 Diaria (todos los días laborales)

- [ ] Abrir el Panel `/documental` y revisar pendientes.
- [ ] Registrar toda la correspondencia recibida antes de mediodía.
- [ ] Registrar despachos y préstamos del día.
- [ ] Revisar bandeja de `documental@corazaseguridadcta.com` al menos 2 veces al día.
- [ ] Al finalizar el día, imprimir la cola de rótulos pendientes en la Niimbot B1.
- [ ] Cerrar sesión del portal.

### 9.2 Semanal

- [ ] Revisar préstamos próximos a vencer y enviar recordatorio manual si es necesario.
- [ ] Verificar coherencia entre VOXELSERA y ubicación física real (auditoría rápida de una estantería).
- [ ] Descargar el reporte de correspondencia de la semana para la reunión operativa.

### 9.3 Mensual

- [ ] Generar informe mensual desde `/documental/informes` (correspondencia, préstamos, minutas, contratos por vencer).
- [ ] Descargar/archivar los correos importantes de la cuenta institucional a la Biblioteca.
- [ ] Revisar contratos que vencen en los próximos 90 días y avisar a Gerencia.
- [ ] Backup manual: exportar el listado de Correspondencia y Préstamos del mes a Excel.

### 9.4 Anual

- [ ] Cierre anual de correspondencia (consecutivo se reinicia según política de Gerencia).
- [ ] Aplicación de TRD: identificar documentos que cumplieron su tiempo de retención → acta con Comité de Archivo.
- [ ] Auditoría física completa del archivo contra VOXELSERA.

---

## 10. Reglas duras (nunca romper)

1. **Nada sale del archivo sin préstamo registrado.**
2. **Nada se elimina sin acta firmada por Comité de Archivo + Gerencia.**
3. **NO imprimir rótulos con Ctrl+P del navegador.** Solo la Niimbot por Bluetooth.
4. **NO compartir la contraseña del correo institucional.** Si alguien más la necesita, hablar con Sistemas.
5. **NO modificar consecutivos automáticos.** Si hay error, editar en observaciones.
6. **NO borrar registros del portal.** Todo queda en auditoría.
7. Ante un requerimiento externo (juzgado, ente de control, cliente), **consultar primero al jefe inmediato antes de entregar documentos originales**.

---

## 11. Contactos internos y escalado

| Área | Responsable | Contacto | Cuándo escalar |
|---|---|---|---|
| Jefe inmediato | _______________________________ | _______________________________ | Aprobaciones, decisiones administrativas. |
| Gerencia | _______________________________ | _______________________________ | Eliminación de documentos, requerimientos externos. |
| Sistemas / Desarrollo | _______________________________ | _______________________________ | Portal caído, error "Unauthorized", problemas con la Niimbot, correo. |
| Talento Humano | _______________________________ | _______________________________ | Solicitud de hojas de vida de retirados. |
| Comité de Archivo | _______________________________ | _______________________________ | Aplicación de TRD, disposición final. |

### Problemas frecuentes y solución rápida

| Síntoma | Solución |
|---|---|
| Aparece "Unauthorized" al guardar | La sesión venció. Ya el portal la renueva sola; si persiste, cerrar sesión y volver a entrar. Reportar a Sistemas si ocurre seguido. |
| La Niimbot no imprime | 1) Verificar Bluetooth encendido. 2) Apagar/prender la Niimbot. 3) Recargar la página. 4) Verificar rollo y batería. |
| Un rótulo se dañó | Cola de Tiras → Historial → Reimprimir Lote (o Restaurar a Cola). |
| El botón "Salir" no responde | Recargar la página con Ctrl+F5. Si el problema persiste, reportar a Sistemas. |
| No aparece un submódulo en el menú | El usuario no tiene el permiso `documental.view` o `documental.loans`. Solicitar a Gerencia. |
| El correo no llega al solicitante | Verificar spam, luego verificar en `/documental/prestamos` que el correo del destinatario esté bien escrito. |

---

## 12. Inventario físico entregado

| Ítem | Cantidad | Estado | Observaciones |
|---|---|---|---|
| Impresora Niimbot B1 | ______ | ______ | Serial: __________________ |
| Rollo de cinta térmica 80 mm | ______ | ______ | |
| Sellos institucionales | ______ | ______ | |
| Llaves de estantería / archivo | ______ | ______ | |
| Carpetas / A-Z | ______ | ______ | |
| PC / Portátil del cargo | ______ | ______ | Serial: __________________ |
| Escáner | ______ | ______ | |
| Otros (especificar) | ______ | ______ | |

---

## 13. Pendientes al día de la entrega

_Listar aquí lo que quede sin cerrar el día de la entrega para que el nuevo Documental lo retome:_

- [ ] _______________________________________________________________
- [ ] _______________________________________________________________
- [ ] _______________________________________________________________
- [ ] _______________________________________________________________
- [ ] _______________________________________________________________

---

## 14. Observaciones finales

_Espacio libre para comentarios de quien entrega (procesos particulares, contactos claves de clientes, casos abiertos):_

_________________________________________________________________________
_________________________________________________________________________
_________________________________________________________________________
_________________________________________________________________________
_________________________________________________________________________

---

## 15. Firmas

**Quien entrega**

Nombre: _______________________________________
C.C.: _____________________
Cargo: Documental
Firma: _______________________________________
Fecha: ______ / ______ / ________

**Quien recibe**

Nombre: _______________________________________
C.C.: _____________________
Cargo: Documental
Firma: _______________________________________
Fecha: ______ / ______ / ________

**Testigo / Jefe inmediato**

Nombre: _______________________________________
C.C.: _____________________
Cargo: _______________________________________
Firma: _______________________________________
Fecha: ______ / ______ / ________

---

## Anexos técnicos (referencia rápida)

- Documento técnico interno del SGD: `docs/GESTION-DOCUMENTAL-SGD.md`.
- Reglas de negocio y procedimientos: `docs/REGLAS-NEGOCIO-Y-PROCEDIMIENTOS.md`.
- Módulo backend (para Sistemas): `apps/api/src/modules/documental/`.
- Módulo frontend (para Sistemas): `apps/web/src/app/features/documental/`.
- Correo institucional: variables `SMTP_*` en Render → servicio `portalcoraza-api` → **Environment**.
- Permisos: gestionados desde `/administracion/usuarios` por Gerencia.
