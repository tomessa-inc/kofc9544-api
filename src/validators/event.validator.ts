import type { EventInput } from "../dto/event.dto";
import { BadRequestError } from "../errors";

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
/** Upper bound on generated occurrences (about two years of weekly events). */
const MAX_REPEATS = 104;

/** POST /event body: `{ data: { ...event } }`. */
export function validateEvent(body: Record<string, any> | undefined): EventInput {
    const data = body?.data;
    if (typeof data !== "object" || data === null) throw new BadRequestError("Missing event data");

    for (const field of ["start", "end"]) {
        if (typeof data[field] !== "string" || !DATE_TIME.test(data[field])) {
            throw new BadRequestError(`${field} must be YYYY-MM-DDTHH:MM`);
        }
    }
    if (typeof data.text !== "string" || !data.text.trim()) throw new BadRequestError("Missing text");

    const recurring = data.recurring ?? "";
    if (!["", "monthly", "weekly"].includes(recurring)) throw new BadRequestError("recurring must be monthly, weekly or empty");

    const frequency = Number(data.frequency ?? 0);
    if (!Number.isInteger(frequency) || frequency < 0 || frequency > MAX_REPEATS) {
        throw new BadRequestError(`frequency must be a whole number from 0 to ${MAX_REPEATS}`);
    }

    return {
        start: data.start,
        end: data.end,
        text: data.text.trim(),
        description: typeof data.description === "string" ? data.description : "",
        recurring,
        frequency,
        viewing: data.viewing === true || data.viewing === "true" || data.viewing === 1,
    };
}

/** The month (1-12) and year to list, from the route or a POST body's `data`. */
export function validateMonth(source: { month?: unknown; year?: unknown }): { month: number; year: number } {
    const month = Number(source.month);
    const year = Number(source.year);
    if (!Number.isInteger(month) || month < 1 || month > 12) throw new BadRequestError("Invalid month");
    if (!Number.isInteger(year) || year < 1900 || year > 9999) throw new BadRequestError("Invalid year");
    return { month, year };
}
