/** Calendar maths for events. Dates are local wall-clock times as entered ("2026-06-15T18:30:00"). */

export type Recurrence = "monthly" | "weekly" | "";

export interface LocalDateTime {
    year: number;
    /** 0-11, as in Date. */
    month: number;
    day: number;
    hour: number;
    minute: number;
}

/** Parse "YYYY-MM-DDTHH:MM[:SS]" without any time-zone conversion. */
export function parseLocalDateTime(value: string): LocalDateTime {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
    if (!match) throw new Error(`Invalid date-time: ${value}`);
    const [, year, month, day, hour, minute] = match.map(Number);
    return { year, month: month - 1, day, hour, minute };
}

/** "<day>-<month>-<year>-<startHour>-<endHour>", the id format events and calendar rows share. */
export function scheduleId(date: Date, startHour: number, endHour: number): string {
    return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}-${startHour}-${endHour}`;
}

/**
 * Date of the nth (1-5) given weekday (0 = Sunday) in a month (0-11, overflow rolls into the next
 * year). If that month has no nth occurrence (e.g. a 5th Monday), the month's last such weekday is used.
 */
export function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date {
    const firstOfMonth = new Date(year, month, 1);
    const firstMatch = 1 + ((weekday - firstOfMonth.getDay() + 7) % 7);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let day = firstMatch + (nth - 1) * 7;
    while (day > daysInMonth) {
        day -= 7;
    }
    return new Date(year, month, day);
}

/**
 * The dates an event happens on: the start date, then `repeats` more. Monthly events keep their weekday
 * position ("first Monday", "third Wednesday"); weekly ones are 7 days apart; others happen once.
 */
export function occurrences(start: LocalDateTime, recurrence: Recurrence, repeats: number): Date[] {
    let date = new Date(start.year, start.month, start.day);
    if (recurrence !== "monthly" && recurrence !== "weekly") return [date];

    const weekday = date.getDay();
    const nth = Math.ceil(date.getDate() / 7);
    const dates = [date];

    for (let i = 0; i < repeats; i++) {
        date = recurrence === "monthly"
            ? nthWeekdayOfMonth(date.getFullYear(), date.getMonth() + 1, weekday, nth)
            : new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
        dates.push(date);
    }
    return dates;
}
