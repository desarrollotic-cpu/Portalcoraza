/** Festivos de Colombia (Ley Emiliani) — portado de APP-CONTABILIDAD. */

export interface ColombiaHoliday {
  date: string; // YYYY-MM-DD
  name: string;
}

export function getColombiaHolidays(year: number): ColombiaHoliday[] {
  const holidays: ColombiaHoliday[] = [];

  const addHoliday = (month: number, day: number, name: string, emiliani = false) => {
    const date = new Date(year, month - 1, day);
    if (emiliani) {
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 1) {
        const daysToAdd = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
        date.setDate(date.getDate() + daysToAdd);
      }
    }
    holidays.push({
      date: toIsoDate(date),
      name,
    });
  };

  addHoliday(1, 1, 'Año Nuevo');
  addHoliday(5, 1, 'Día del Trabajo');
  addHoliday(7, 20, 'Día de la Independencia');
  addHoliday(8, 7, 'Batalla de Boyacá');
  addHoliday(12, 8, 'Día de la Inmaculada Concepción');
  addHoliday(12, 25, 'Navidad');

  addHoliday(1, 6, 'Día de los Reyes Magos', true);
  addHoliday(3, 19, 'Día de San José', true);
  addHoliday(6, 29, 'San Pedro y San Pablo', true);
  addHoliday(8, 15, 'Asunción de la Virgen', true);
  addHoliday(10, 12, 'Día de la Raza', true);
  addHoliday(11, 1, 'Todos los Santos', true);
  addHoliday(11, 11, 'Independencia de Cartagena', true);

  const easter = getEaster(year);

  const holyThursday = new Date(easter);
  holyThursday.setDate(easter.getDate() - 3);
  holidays.push({ date: toIsoDate(holyThursday), name: 'Jueves Santo' });

  const holyFriday = new Date(easter);
  holyFriday.setDate(easter.getDate() - 2);
  holidays.push({ date: toIsoDate(holyFriday), name: 'Viernes Santo' });

  const addMoving = (daysAfterEaster: number, name: string) => {
    const date = new Date(easter);
    date.setDate(easter.getDate() + daysAfterEaster);
    holidays.push({ date: toIsoDate(date), name });
  };
  addMoving(43, 'Ascensión del Señor');
  addMoving(64, 'Corpus Christi');
  addMoving(71, 'Sagrado Corazón de Jesús');

  return holidays;
}

export function isColombiaHoliday(
  year: number,
  month: number,
  day: number,
  holidays?: ColombiaHoliday[],
): ColombiaHoliday | undefined {
  const list = holidays ?? getColombiaHolidays(year);
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return list.find((h) => h.date === iso);
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}
