import type { UserFilters } from "../mapper/user.mapper";
import type { AccessDto, LoginDto, SignUpDto, UserUpdateDto } from "../dto/user.dto";
import { BadRequestError } from "../errors";
import { MissingCredentialsError } from "../errors/auth.errors";
import { MIN_PASSWORD_LENGTH } from "../service/password.service";

type Body = Record<string, unknown> | undefined;

const text = (value: unknown): string | undefined => (typeof value === "string" && value.trim() ? value.trim() : undefined);

export function validateLogin(body: Body): LoginDto {
    const username = text(body?.username);
    // Passwords are taken as typed (no trimming).
    const password = typeof body?.password === "string" && body.password ? body.password : undefined;
    if (!username || !password) throw new MissingCredentialsError();
    return { username, password };
}

export function validateEmail(body: Body): string {
    const email = text(body?.email);
    if (!email) throw new BadRequestError("Missing email");
    return email;
}

/** PATCH /user body: `{ id, user: { ...fields } }`; only editable fields are kept. */
export function validateUserPatch(body: Body): { id: string; changes: UserUpdateDto } {
    const id = text(body?.id);
    const user = body?.user;
    if (!id || typeof user !== "object" || user === null) {
        throw new BadRequestError("Missing parameters to access this function");
    }
    return { id, changes: pickUserChanges(user as Record<string, unknown>) };
}

export function validateUserUpdate(body: Body): UserUpdateDto {
    return pickUserChanges(body ?? {});
}

/** A new password, taken exactly as typed (never trimmed: sign-in compares it as typed). */
function newPassword(value: unknown): string {
    if (typeof value !== "string" || value.length < MIN_PASSWORD_LENGTH) {
        throw new BadRequestError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    return value;
}

function pickUserChanges(source: Record<string, unknown>): UserUpdateDto {
    const changes: UserUpdateDto = {};
    for (const field of ["firstName", "lastName", "email"] as const) {
        const value = text(source[field]);
        if (value !== undefined) changes[field] = value;
    }
    if (source.password !== undefined && source.password !== "") changes.password = newPassword(source.password);
    if (Object.keys(changes).length === 0) throw new BadRequestError("Nothing to update");
    return changes;
}

export function validateSignUp(body: Body): SignUpDto {
    const username = text(body?.username);
    const email = text(body?.email);
    if (!username || !email || !body?.password) throw new BadRequestError("Missing required fields");
    return { username, email, password: newPassword(body.password), firstName: text(body?.firstName), lastName: text(body?.lastName) };
}

/** Longest role name and description the `access` table holds. */
export const MAX_ACCESS_NAME = 45;
export const MAX_ACCESS_DESCRIPTION = 100;

/** A role's name (required) and description (optional, "" when absent), for both create and update. */
export function validateAccess(body: Body): AccessDto {
    const name = text(body?.name);
    const description = text(body?.description) ?? "";
    if (!name) throw new BadRequestError("Missing required fields");
    if (name.length > MAX_ACCESS_NAME) throw new BadRequestError(`Role name must be ${MAX_ACCESS_NAME} characters or fewer`);
    if (description.length > MAX_ACCESS_DESCRIPTION) {
        throw new BadRequestError(`Description must be ${MAX_ACCESS_DESCRIPTION} characters or fewer`);
    }
    return { name, description };
}

/**
 * User-list filters from a list request body. The admin sends its search form as
 * `{ params: { firstName, lastName, email, ... } }`; blank and non-text values are ignored.
 */
export function userListFilters(body: Record<string, unknown> | undefined): UserFilters {
    const source = (body?.params ?? body ?? {}) as Record<string, unknown>;
    const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
    return {
        firstName: text(source.firstName),
        lastName: text(source.lastName),
        email: text(source.email),
    };
}
