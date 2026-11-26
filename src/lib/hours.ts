/**
 * Horarios del comercio (tabla business_hours). Funciones puras, sin base ni Next.
 * Día 0 = domingo. Si `closes_at` es menor que `opens_at`, el rango cruza la medianoche
 * (por ejemplo, 19:00 a 00:30 del día siguiente).
 */

export type HoursRange = { weekday: number; opens_at: string; closes_at: string };
export type OpenMode = "auto" | "open" | "closed";

const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
/** Orden de la semana para mostrar: de lunes a domingo. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Día de la semana y minuto del día de una fecha en la zona horaria del comercio. */
export function localTime(date: Date, timeZone: string): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { weekday, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** ¿Está abierto en este momento? `open`/`closed` fuerzan el estado sin mirar el horario. */
export function isOpenAt(hours: HoursRange[], mode: OpenMode, date: Date, timeZone: string): boolean {
  if (mode === "open") return true;
  if (mode === "closed") return false;

  const now = localTime(date, timeZone);
  const yesterday = (now.weekday + 6) % 7;

  return hours.some((range) => {
    const opens = toMinutes(range.opens_at);
    const closes = toMinutes(range.closes_at);
    if (opens < closes) {
      return range.weekday === now.weekday && now.minutes >= opens && now.minutes < closes;
    }
    // Cruza la medianoche: la parte de hoy desde que abre, o la cola del rango de ayer.
    return (
      (range.weekday === now.weekday && now.minutes >= opens) ||
      (range.weekday === yesterday && now.minutes < closes)
    );
  });
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":");
  return `${Number(h)}:${m}`;
}

function rangesOf(hours: HoursRange[], weekday: number): string {
  return hours
    .filter((h) => h.weekday === weekday)
    .sort((a, b) => toMinutes(a.opens_at) - toMinutes(b.opens_at))
    .map((h) => `${formatTime(h.opens_at)} a ${formatTime(h.closes_at)}`)
    .join(" y ");
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Resumen legible, agrupando días seguidos con el mismo horario:
 * ["Martes a domingo: 19:00 a 0:30"] o ["Lunes a viernes: 9:00 a 13:00 y 17:00 a 21:00", "Sábado: 9:00 a 13:00"].
 * Los días sin horario no se listan.
 */
export function summarizeHours(hours: HoursRange[]): string[] {
  const groups: { days: number[]; ranges: string }[] = [];
  for (const day of WEEK_ORDER) {
    const ranges = rangesOf(hours, day);
    const last = groups.at(-1);
    const previousDay = last?.days.at(-1);
    const isNext = previousDay !== undefined && WEEK_ORDER.indexOf(previousDay) === WEEK_ORDER.indexOf(day) - 1;
    if (last && isNext && last.ranges === ranges) last.days.push(day);
    else groups.push({ days: [day], ranges });
  }

  return groups
    .filter((g) => g.ranges !== "")
    .map((g) => {
      const first = DAY_NAMES[g.days[0]];
      const label =
        g.days.length === 1
          ? first
          : `${first} ${g.days.length === 2 ? "y" : "a"} ${DAY_NAMES[g.days.at(-1)!]}`;
      return `${capitalize(label)}: ${g.ranges}`;
    });
}

/** Horario de hoy en la zona del comercio ("19:00 a 0:30") o "Cerrado hoy". Depende de la hora: se calcula en el navegador. */
export function todayHours(hours: HoursRange[], date: Date, timeZone: string): string {
  const now = localTime(date, timeZone);
  // Pasada la medianoche, si sigue abierto el rango de ayer que cruza la medianoche,
  // "hoy" es ese rango: así no dice "Cerrado hoy" al lado de "Abierto ahora".
  const yesterday = (now.weekday + 6) % 7;
  const inYesterdayTail = hours.some(
    (h) => h.weekday === yesterday && toMinutes(h.closes_at) < toMinutes(h.opens_at) && now.minutes < toMinutes(h.closes_at),
  );
  return rangesOf(hours, inYesterdayTail ? yesterday : now.weekday) || "Cerrado hoy";
}
