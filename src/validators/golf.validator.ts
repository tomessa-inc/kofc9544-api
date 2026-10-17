import type { HoleDto, NewPlayerDto, PlayerUpdateDto, RegistrationDto, TeamUpdateDto } from "../dto/golf.dto";
import { BadRequestError } from "../errors";

type Body = Record<string, unknown> | undefined;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): string | undefined => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : undefined);

function requireBody(body: Body): Record<string, unknown> {
    if (!isObject(body)) throw new BadRequestError("Missing request body");
    return body;
}

function requireText(body: Record<string, unknown>, field: string): string {
    const value = text(body[field]);
    if (!value) throw new BadRequestError(`Missing ${field}`);
    return value;
}

/** Copy only the listed optional string fields that are present. */
function pickText<K extends string>(body: Record<string, unknown>, fields: readonly K[]): Partial<Record<K, string>> {
    const picked: Partial<Record<K, string>> = {};
    for (const field of fields) {
        const value = text(body[field]);
        if (value !== undefined) picked[field] = value;
    }
    return picked;
}

export function validateRegistration(input: Body): RegistrationDto {
    const body = requireBody(input);
    if (!Array.isArray(body.players) || body.players.length === 0) {
        throw new BadRequestError("At least one player is required");
    }

    const players = body.players.map((entry, index) => {
        if (!isObject(entry)) throw new BadRequestError(`Player ${index + 1} is invalid`);
        const player = text(entry.player);
        const email = text(entry.email);
        if (!player || !email) throw new BadRequestError(`Player ${index + 1} needs a name and email`);
        return { player, email, phone: text(entry.phone) ?? "", ...pickText(entry, ["allergies"] as const) };
    });

    const payment = body.payment === undefined || body.payment === null ? undefined : Number(body.payment);
    if (payment !== undefined && Number.isNaN(payment)) throw new BadRequestError("Invalid payment");

    return {
        team_name: text(body.team_name) ?? "",
        players,
        ...(payment !== undefined && { payment }),
        ...pickText(body, ["member"] as const),
    };
}

export function validateNewPlayer(input: Body): NewPlayerDto {
    const body = requireBody(input);
    return {
        name: requireText(body, "name"),
        email: requireText(body, "email"),
        phone: text(body.phone) ?? "",
        ...pickText(body, ["TeamId", "allergies"] as const),
    };
}

export function validatePlayerUpdate(input: Body): PlayerUpdateDto {
    return pickText(requireBody(input), ["name", "email", "phone", "TeamId", "allergies"] as const);
}

export function validateTeamUpdate(input: Body): TeamUpdateDto {
    return pickText(requireBody(input), ["name", "captain", "hole"] as const);
}

export function validateHole(input: Body): HoleDto {
    const body = requireBody(input);
    return { name: requireText(body, "name"), ...pickText(body, ["par"] as const) };
}
