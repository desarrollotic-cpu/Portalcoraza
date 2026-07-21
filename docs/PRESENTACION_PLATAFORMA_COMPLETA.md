# Portal Coraza — Documento de Presentación de la Plataforma

> **Propósito:** documento completo para exponer en qué va el proceso de la plataforma Portal Coraza.
> **Enfoque:** claro, para hablar frente a dirección y áreas usuarias, con el estado real de cada módulo.
> **Fecha del documento:** julio 2026

---

## 0. Resumen ejecutivo (léelo primero)

**Portal Coraza** es la plataforma web interna de la empresa de seguridad privada Coraza. Reúne en **un solo sistema** todo lo que antes estaba disperso en planillas de Excel y archivos sueltos: personal, dotación, programación de turnos, documentos, unidades residenciales y administración.

**En una frase:** *el personal se registra una sola vez y todas las áreas trabajan sobre la misma información, actualizada y segura.*

**Estado general del proyecto:**

- ✅ **Base tecnológica lista y desplegada en la nube.**
- ✅ **Módulos principales funcionando:** Gestión Humana y Dotación (completos), y en versión operativa Programación, Documental, Residencial y Administración.
- 🟡 **En curso:** pulido visual de cada módulo y afinamiento de reglas de negocio.
- ⏳ **Pendiente:** portal personal del vigilante y algunos reportes avanzados.

---

## 1. ¿Qué es Portal Coraza?

Imagínelo como **un solo edificio digital** con varias oficinas conectadas:

| Oficina (módulo) | Para qué sirve |
|------------------|----------------|
| **Gestión Humana (RRHH)** | Hoja de vida de cada asociado, retiros, cumplimiento de seguridad y salud en el trabajo |
| **Dotación** | Entrega de uniformes y elementos con firma digital y control de inventario |
| **Programación** | Cuadro mensual de turnos por puesto |
| **Documental** | Documentos institucionales de la empresa |
| **Residencial** | Control de acceso: visitantes, paquetes, reservas en unidades residenciales |
| **Administración** | Usuarios, roles y permisos del portal |
| **Dashboard** | Tablero de indicadores según el rol de quien ingresa |

**Idea clave:** Gestión Humana es la **fuente oficial del personal**. Los demás módulos **consultan** esa información; nunca duplican listas.

---

## 2. ¿Qué problema resuelve?

**Antes (situación típica):**
- Listas en Excel que no coinciden entre áreas.
- Difícil saber quién tiene exámenes, cursos o pólizas al día.
- Retiros sin historial claro.
- Cada área con su propia "versión de la verdad".
- Entregas de dotación sin control ni firma.

**Ahora (con Portal Coraza):**
- **Un solo registro** por asociado, consultable por quien tenga permiso.
- **Semáforo visual** de cumplimiento (seguridad en el trabajo).
- **Alertas** cuando algo está por vencer.
- **Retiros documentados** con motivo y encuesta de salida.
- **Entregas de dotación con firma digital** y trazabilidad.
- **Bitácora**: quién cambió qué y cuándo.

---

## 3. Arquitectura general (explicación simple)

La plataforma tiene tres piezas, todas en la nube:

1. **La aplicación web (lo que ve el usuario):** se abre desde el navegador (Chrome/Edge), sin instalar nada. Construida con tecnología moderna (Angular 21).
2. **El servidor (la lógica y las reglas):** procesa la información y aplica las reglas de negocio y de seguridad (NestJS).
3. **La base de datos (donde se guarda todo):** almacenamiento seguro en la nube con respaldo (PostgreSQL / Supabase).

**Cómo se publica:** cada cambio aprobado se sube al repositorio en GitHub y se **despliega automáticamente** en la nube (Render). Esto permite mejorar la plataforma de forma continua.

> **Nota de seguridad:** cada usuario entra con su propio usuario y contraseña, y el sistema le muestra **solo lo que le corresponde** según su rol. La información sensible está restringida conforme a la Ley 1581 de protección de datos.

---

## 4. Estado por módulo

Leyenda: ✅ Completo · 🟢 Operativo (funcional, en pulido) · 🟡 Básico · ⏳ Pendiente

### 4.1 Gestión Humana (RRHH) — ✅/🟢 el módulo más avanzado

**Qué hace:** es la hoja de vida digital de todo el personal.

Pantallas disponibles:
- **Panel general:** cuántos asociados activos, en vacaciones o retirados; gráficos de rotación, edades, EPS, cargos y centros de trabajo.
- **Directorio de asociados:** lista con búsqueda por nombre/cédula, filtros por estado y **luces verde/rojo** de cumplimiento.
- **Ficha del asociado (hoja de vida):** datos personales, laborales, sociodemográficos y documentos adjuntos.
- **Matriz de cumplimiento SST:** por persona y cargo (curso, psicofísico, psicosensométrico, póliza), con **exportación a Excel**.
- **Alertas:** vencimientos y pendientes, marcables como resueltos.
- **Retiros:** registro formal con motivo, fecha y encuesta de salida; permite **reingreso** conservando el historial.
- **Cargos, centros de trabajo y catálogos:** datos maestros que alimentan el sistema.
- **Importación desde Excel:** carga masiva con revisión de errores y vista previa.
- **Bitácora:** registro de cambios para auditoría.

**Beneficio:** una sola verdad del personal, cumplimiento visible y trazabilidad completa.

---

### 4.2 Dotación — ✅ completo

**Qué hace:** controla el inventario de uniformes/elementos y las entregas al personal.

Pantallas disponibles:
- **Panel principal:** indicadores, alertas de stock bajo, últimas entregas.
- **Inventario:** items y variantes (talla, género, etc.).
- **Entregas + firma digital:** el almacenista registra la entrega y el asociado firma.
- **Reversión controlada** de entregas.
- **Historial de movimientos** filtrable.
- **Reporte "sin dotación 7+ meses":** identifica a quién le corresponde renovación.

**Reglas de negocio ya definidas:**
- Solo el **Almacenista** inicia y revierte entregas.
- Solo se entrega a asociados **Activos** o en **Vacaciones**.

**Beneficio:** control real del inventario y de qué recibió cada persona, con evidencia firmada.

---

### 4.3 Programación — 🟢 operativo (versión inicial)

**Qué hace:** arma el **cuadro mensual de turnos por puesto** (roles por día).

Disponible hoy:
- **Tablero mensual:** filas = roles/turnos, columnas = días del mes.
- **Motor de ciclo automático (D/N/R/NR):** genera el patrón de turnos día y noche con descansos, continuando el ciclo del mes anterior.
- Edición de cada celda, asignación de titulares, y estados laborales (vacaciones, licencia, incapacidad, etc.).
- **Guardar como borrador** y **publicar**.

**Regla clave:** un programador solo puede programar los puestos que tiene asignados, y consume el personal desde Gestión Humana (solo lectura).

**Beneficio:** el cuadro de turnos deja de hacerse a mano en Excel; el sistema propone y valida.

---

### 4.4 Documental — 🟡 básico funcionando

**Qué hace:** gestiona documentos institucionales (contratos, políticas, certificados).

Disponible: lista de documentos y formulario de alta/edición.

**Beneficio:** documentos centralizados y clasificados por tipo.

---

### 4.5 Residencial — 🟢 operativo (versión inicial)

**Qué hace:** control de acceso y operación de las unidades residenciales atendidas por Coraza.

Disponible hoy:
- **Unidades**, **Visitantes**, **Paquetes** y **Reservas**.
- Base de datos preparada para incidencias y parqueadero de visitantes.

**Beneficio:** portería digital: registro ordenado de quién entra, qué paquetes llegan y qué zonas se reservan.

---

### 4.6 Administración — 🟢 operativo

**Qué hace:** gestión de usuarios del portal, roles y permisos.

Disponible: lista y alta de usuarios, y matriz de roles × permisos.

**Beneficio:** control central de quién accede y a qué.

---

### 4.7 Dashboard — ✅ con diseño premium

**Qué hace:** pantalla de bienvenida con indicadores según el rol (por ejemplo, para Gerencia: activos, dotaciones pendientes, documentos a revisar, novedades, reservas).

---

### 4.8 Acceso / Portal personal del vigilante — ⏳ pendiente

- ✅ **Login seguro** (usuario + contraseña) y notificaciones en tiempo real: funcionando.
- ⏳ **"Mi Portal" del vigilante** (colillas de pago, cursos, exámenes, su propia programación): por construir.

---

## 5. Tabla resumen de avance (para diapositiva)

| Módulo | Estado | Comentario |
|--------|--------|------------|
| Gestión Humana (RRHH) | ✅ Listo para pruebas | Hoja de vida digital completa |
| Dotación | ✅ Completo | Inventario + entregas con firma + reportes |
| Programación | 🟢 Operativo | Cuadro mensual + motor de turnos |
| Residencial | 🟢 Operativo | Visitantes, paquetes, reservas, unidades |
| Administración | 🟢 Operativo | Usuarios, roles, permisos |
| Documental | 🟡 Básico | Gestión de documentos |
| Dashboard | ✅ Listo | Indicadores por rol |
| Login / seguridad | ✅ Listo | Acceso por rol |
| Portal del vigilante | ⏳ Pendiente | Colillas, cursos, programación personal |

---

## 6. ¿Quién ve qué? (seguridad por roles)

| Perfil | Qué puede hacer |
|--------|-----------------|
| **Gerencia** | Todo el sistema |
| **Recursos Humanos** | Crear, editar, retirar e importar personal; ver datos sensibles |
| **Programador** | Armar cuadros de turnos de sus puestos; consultar personal |
| **Almacenista** | Dotación completa (inventario, entregas, firma) |
| **Administrador de Unidad** | Operar su unidad residencial (visitantes, paquetes, reservas) |
| **Vigilante** | Operación residencial de su puesto y (a futuro) su portal personal |

Cada persona entra con su usuario; el sistema muestra solo lo que le corresponde. La información sensible (por Ley 1581) queda restringida a Gerencia y RRHH.

---

## 7. Beneficios para la empresa

- ✅ **Una sola verdad** sobre el personal.
- ✅ **Menos errores** por planillas desactualizadas.
- ✅ **Cumplimiento SST visible** (matriz + alertas).
- ✅ **Trazabilidad** en retiros, entregas y cambios.
- ✅ **Ahorro de tiempo** en cargas masivas (Excel) y en el cuadro de turnos.
- ✅ **Control de acceso** según rol y protección de datos.
- ✅ **Mejora continua:** cada ajuste se publica en la nube automáticamente.

---

## 8. Lo que falta y hoja de ruta

**Compromiso del equipo:** terminar un módulo completo antes de saltar al siguiente.

| Prioridad | Tema | Situación |
|-----------|------|-----------|
| 1 | Validación de Gestión Humana con RRHH y SST | Listo para que el área lo pruebe |
| 2 | Pulido visual de Programación, Documental y Residencial | En curso |
| 3 | Reglas finas por puesto (que cada usuario opere solo lo asignado) | En curso |
| 4 | Portal personal del vigilante | Pendiente de construir |
| 5 | Reportes avanzados y pruebas automatizadas | Pendiente |

---

## 9. Estado técnico y de despliegue (para responder si preguntan)

- **La plataforma está desplegada en la nube.** La aplicación web (lo que ve el usuario) está publicada y accesible por navegador.
- **Se accede sin instalar nada**, como entrar a un correo web.
- **Publicación continua:** los cambios se suben a GitHub y se despliegan automáticamente en Render.
- **Base de datos** en Supabase (PostgreSQL) con respaldo en la nube.
- **Punto en atención actualmente:** ajuste de la conexión del servidor con la base de datos en el ambiente de producción (parámetro de configuración de la nube). No afecta el desarrollo ni los datos; se resuelve desde el panel de administración del hosting.

---

## 10. Guion sugerido para la presentación (habla mientras navegas)

1. "Portal Coraza reúne toda la empresa en un solo sistema." → mostrar el menú lateral con los módulos.
2. "Gestión Humana es la hoja de vida digital." → panel → directorio → abrir una ficha → mostrar pestañas y documentos.
3. "Aquí vemos el cumplimiento SST." → matriz + exportar a Excel.
4. "Las alertas avisan lo que está por vencer." → pantalla de alertas.
5. "Los retiros quedan documentados con encuesta." → pantalla de retiros.
6. "La dotación se entrega con firma y queda registrada." → panel de dotación → una entrega.
7. "La programación arma el cuadro mensual de turnos." → tablero mensual + motor de ciclo.
8. "Todo queda con trazabilidad y control de acceso por rol." → mencionar bitácora y roles.

> **Plan B:** tener 6–8 capturas de pantalla guardadas por si falla la conexión.

---

## 11. Preguntas para pedir directrices (cierre de la reunión)

1. ¿Aprueban iniciar pruebas de Gestión Humana con RRHH y SST?
2. ¿Hay algún reporte que hoy usen en Excel y no vean reflejado aquí?
3. ¿Quién será el "usuario piloto" que pruebe y dé retroalimentación?
4. Después de validar RRHH, ¿cuál es la prioridad: Programación, Documental o Residencial?
5. ¿Para cuándo desean tenerlo en uso real?
6. ¿Requieren capacitación presencial o basta un manual corto?

---

## 12. Checklist antes de presentar

- [ ] Portal abierto y con sesión iniciada (usuario de Gerencia).
- [ ] 2–3 asociados con datos completos para mostrar.
- [ ] Capturas de respaldo por si falla la conexión.
- [ ] Este documento impreso o en tablet.
- [ ] Proyector / pantalla compartida probada.

---

**Fin del documento.**
