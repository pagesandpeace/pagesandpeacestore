export const LONDON_TIME_ZONE = "Europe/London";

type DateLike = string | Date | number;

function asDate(value: DateLike) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date value");
  return date;
}

export function formatLondonDateTime(value: DateLike, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: LONDON_TIME_ZONE }).format(asDate(value));
}

function londonParts(value: DateLike) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(asDate(value));
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

export function toLondonDateTimeInput(value: DateLike) {
  const parts = londonParts(value);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Converts a datetime-local UK wall-clock time to its UTC instant. */
export function parseLondonDateTimeInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Invalid London date and time");
  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText), hour = Number(hourText), minute = Number(minuteText);
  const localMillis = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(localMillis);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day || check.getUTCHours() !== hour || check.getUTCMinutes() !== minute) throw new Error("Invalid London date and time");
  const candidates = [localMillis, localMillis - 60 * 60 * 1000]
    .filter((candidate, index, values) => values.indexOf(candidate) === index)
    .filter((candidate) => toLondonDateTimeInput(new Date(candidate)) === value)
    .sort((a, b) => a - b);
  if (!candidates.length) throw new Error("This time does not exist in the UK due to daylight saving time.");
  return new Date(candidates[0]);
}
