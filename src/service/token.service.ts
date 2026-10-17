import jwt from "jsonwebtoken";
import { config } from "../config";

/** What a token may be used for; a token is only accepted for the purpose it was issued for. */
export type TokenPurpose = "access" | "refresh" | "password-reset";

const LIFETIME: Record<TokenPurpose, string> = {
    access: "7d",
    refresh: "30d",
    "password-reset": "1h",
};

/** Issues and verifies the JWTs used for sessions and password-reset links. */
export class TokenService {
    constructor(private readonly secret: () => string = () => config.tokenSecret) {}

    public sign(userId: string, purpose: TokenPurpose): string {
        return jwt.sign({ id: userId, purpose }, this.secret(), { expiresIn: LIFETIME[purpose] as jwt.SignOptions["expiresIn"] });
    }

    /** The user id in a valid, unexpired token issued for `purpose`, otherwise null. */
    public verify(token: string, purpose: TokenPurpose): string | null {
        try {
            const payload = jwt.verify(token, this.secret()) as jwt.JwtPayload;
            return payload.purpose === purpose && typeof payload.id === "string" ? payload.id : null;
        } catch {
            return null;
        }
    }
}

export const tokenService = new TokenService();
