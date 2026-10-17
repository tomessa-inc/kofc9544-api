import { and, eq, sql } from "drizzle-orm";
import { QueryExecutor, sqlExecutor } from "../db/executor";
import { db } from "../db/query-builder";
import { user } from "../models/User";
import { userAuthentication } from "../models/UserAuthentication";
import { profileColumns, type UserProfile } from "./user.mapper";
import type { WriteResult } from "./types";

/** Kinds of issued token stored in `user_authentication.eventType`. */
export const TokenType = {
    /** A login session's access token. */
    Session: "LOGGED",
    /** A password-reset link's token. */
    PasswordReset: "RESET_PASSWORD",
} as const;
export type TokenType = (typeof TokenType)[keyof typeof TokenType];

/** Data access for issued tokens (`user_authentication`). */
export class SessionTokenMapper {
    constructor(private readonly executor: QueryExecutor = sqlExecutor) {}

    public insert(userId: string, token: string, type: TokenType): Promise<WriteResult> {
        return this.executor.run(db.insert(userAuthentication).values({ UserId: userId, token, eventType: type }));
    }

    /** Revoke a member's tokens of one type, or all of them when no type is given. */
    public deleteForUser(userId: string, type?: TokenType): Promise<WriteResult> {
        const forUser = eq(userAuthentication.UserId, userId);
        return this.executor.run(db.delete(userAuthentication).where(type ? and(forUser, eq(userAuthentication.eventType, type)) : forUser));
    }

    public deleteToken(token: string): Promise<WriteResult> {
        return this.executor.run(db.delete(userAuthentication).where(eq(userAuthentication.token, token)));
    }

    /** The member a token of the given type was issued to. */
    public async findUser(token: string, type: TokenType): Promise<(UserProfile & { realName: string }) | undefined> {
        const rows = await this.executor.run(
            db.select({ ...profileColumns, realName: sql<string>`concat(${user.firstName}, ' ', ${user.lastName})`.as("realName") })
                .from(user)
                .innerJoin(userAuthentication, eq(user.id, userAuthentication.UserId))
                .where(and(eq(userAuthentication.token, token), eq(userAuthentication.eventType, type))),
        );
        return rows[0];
    }
}

export const sessionTokenMapper = new SessionTokenMapper();
