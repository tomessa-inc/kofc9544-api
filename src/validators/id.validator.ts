import { BadRequestError } from "../errors";

/** A numeric route id (e.g. auto-increment player ids). */
export function validateNumericId(value: string | undefined, label = "id"): number {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new BadRequestError(`Invalid ${label}`);
    return id;
}

/** A string route id, with the literal "undefined"/"null" a client sends for a missing value rejected. */
export function validateTextId(value: string | undefined, label = "id"): string {
    if (!value || value === "undefined" || value === "null") throw new BadRequestError(`Missing ${label}`);
    return value;
}
