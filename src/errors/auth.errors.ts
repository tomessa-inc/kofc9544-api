import { AppError } from "./index";

/** Login without a username or password (403, message and error both the reason, as the API has always sent). */
export class MissingCredentialsError extends AppError {
    constructor() {
        super(403, "Username or password is incorrect.", "Username or password is incorrect.");
    }
}

/** Login with credentials that match no member. */
export class InvalidCredentialsError extends AppError {
    constructor() {
        super(400, "BadRequestException", "Username and/or Password incorrect");
    }
}
