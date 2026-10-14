/**
 * Topes de subida. Multer guarda el archivo completo en RAM (memoryStorage),
 * y el parseo posterior (XLSX/ExcelJS) lo expande varias veces su tamaño:
 * sin tope, una sola subida grande tumba la instancia por memoria.
 */

/** Excel de importación (nómina, ausentismo, personal). */
export const MAX_EXCEL_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Documentos adjuntos del asociado (PDF, imágenes). */
export const MAX_DOCUMENT_UPLOAD_BYTES = 15 * 1024 * 1024;
