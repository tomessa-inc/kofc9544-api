/**
 * Domain errors. Services throw these; controllers turn them into responses via handleError().
 * `code` is the response envelope's `message` field, kept identical to the values the API already returns.
 */
export class AppError extends Error {
    constructor(
        public readonly status: number,
        public readonly code: string,
        message: string,
    ) {
        super(message);
        this.name = new.target.name;
    }
}

export class BadRequestError extends AppError {
    constructor(message = "Bad request") {
        super(400, "BadRequest", message);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = "Unauthorized Exception") {
        super(401, "Unauthorized Exception", message);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = "Forbidden Exception") {
        super(403, "Forbidden Exception", message);
    }
}

export class NotFoundError extends AppError {
    constructor(message = "Not found") {
        super(404, "NotFound", message);
    }
}

export class ConflictError extends AppError {
    constructor(message = "Conflict") {
        super(409, "Conflict", message);
    }
}
