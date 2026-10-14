/**
 * Zona horaria de operación del negocio.
 *
 * El resto de la app ya formatea fechas con 'America/Bogota'. Los @Cron, en
 * cambio, usan la hora del servidor si no se les pasa timeZone, y en Render el
 * contenedor corre en UTC: sin esto, una tarea programada "a las 8:00" se
 * ejecuta a las 3:00 de la madrugada hora Colombia.
 */
export const APP_TIMEZONE = 'America/Bogota';
