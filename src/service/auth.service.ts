import { UnauthorizedError } from "../errors";
import { InvalidCredentialsError } from "../errors/auth.errors";
import { SessionTokenMapper, sessionTokenMapper, TokenType } from "../mapper/session-token.mapper";
import { UserMapper, userMapper, type UserProfile } from "../mapper/user.mapper";
import { mailService, type PasswordResetMailer } from "./mail.service";
import { TokenService, tokenService } from "./token.service";

type UserStore = Pick<UserMapper, "findByCredentials" | "findByEmail">;
type SessionStore = Pick<SessionTokenMapper, "insert" | "deleteForUser" | "deleteToken" | "findUser">;
type Tokens = Pick<TokenService, "sign" | "verify">;

export interface Session {
    user: UserProfile;
    accessToken: string;
    refreshToken: string;
}

/**
 * Member authentication. A session is a signed access token that is also recorded in
 * user_authentication: it is valid only while both the signature/expiry check and the record hold,
 * so logout and a new login revoke it.
 */
export class AuthService {
    constructor(
        private readonly users: UserStore,
        private readonly sessions: SessionStore,
        private readonly tokens: Tokens,
        private readonly mailer: PasswordResetMailer,
    ) {}

    public async login(login: string, password: string): Promise<Session> {
        const user = await this.users.findByCredentials(login, password);
        if (!user) throw new InvalidCredentialsError();
        return this.startSession(user);
    }

    public async logout(accessToken: string | null): Promise<void> {
        if (accessToken) await this.sessions.deleteToken(accessToken);
    }

    /** The member a session token belongs to, or null (a dead token's record is cleaned up). */
    public async currentUser(accessToken: string | null) {
        if (!accessToken) return null;

        const user = this.tokens.verify(accessToken, "access") ? await this.sessions.findUser(accessToken, TokenType.Session) : undefined;
        if (!user) {
            await this.sessions.deleteToken(accessToken);
            return null;
        }

        // A member who is signed in no longer needs any outstanding reset link.
        await this.sessions.deleteForUser(user.id, TokenType.PasswordReset);
        return user;
    }

    /** Email a password-reset link. Says nothing about whether the email is registered. */
    public async requestPasswordReset(email: string): Promise<void> {
        const user = await this.users.findByEmail(email);
        if (!user) return;

        const resetToken = this.tokens.sign(user.id, "password-reset");
        await this.sessions.deleteForUser(user.id, TokenType.PasswordReset);
        await this.sessions.insert(user.id, resetToken, TokenType.PasswordReset);

        try {
            await this.mailer.sendPasswordReset({ email: user.email, firstName: user.firstName }, resetToken);
        } catch (error) {
            console.error(`Password reset email not sent: ${error}`);
        }
    }

    /** Exchange a reset link's token for a session; the link stops working once used. */
    public async loginWithResetToken(resetToken: string | null): Promise<Session> {
        return this.startSession(await this.userForResetToken(resetToken));
    }

    /** The member a valid, unused reset token was issued to. */
    public async userForResetToken(resetToken: string | null): Promise<UserProfile> {
        const user = resetToken && this.tokens.verify(resetToken, "password-reset")
            ? await this.sessions.findUser(resetToken, TokenType.PasswordReset)
            : undefined;
        if (!user) throw new UnauthorizedError("Invalid or expired token");
        return user;
    }

    /** One session per member: signing in ends their other sessions and any pending reset link. */
    private async startSession(user: UserProfile): Promise<Session> {
        const accessToken = this.tokens.sign(user.id, "access");
        const refreshToken = this.tokens.sign(user.id, "refresh");

        await this.sessions.deleteForUser(user.id, TokenType.PasswordReset);
        await this.sessions.deleteForUser(user.id, TokenType.Session);
        await this.sessions.insert(user.id, accessToken, TokenType.Session);

        return { user, accessToken, refreshToken };
    }
}

export const authService = new AuthService(userMapper, sessionTokenMapper, tokenService, mailService);
