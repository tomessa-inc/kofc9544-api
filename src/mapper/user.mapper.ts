import { eq, like, notLike, or, sql } from "drizzle-orm";
import { QueryExecutor, sqlExecutor } from "../db/executor";
import { db } from "../db/query-builder";
import { user } from "../models/User";
import type { Page, WriteResult } from "./types";

/** A member as returned to clients: never includes the password or token columns. */
export interface UserProfile {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    roles: string[] | null;
}

export interface NewUser {
    id: string;
    userName: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}

export interface UserChanges {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
}

// Correlated subqueries name the outer `user` row literally (see TeamMapper for why).
export const roleIds = sql<string[] | null>`(SELECT JSON_ARRAYAGG(access.id) FROM access INNER JOIN user_access ON access.id = user_access.AccessId WHERE user_access.UserId = user.id)`;
const roleObjects = sql<{ id: string; name: string }[] | null>`(SELECT JSON_ARRAYAGG(JSON_OBJECT('id', access.id, 'name', access.name)) FROM access INNER JOIN user_access ON access.id = user_access.AccessId WHERE user_access.UserId = user.id)`;

/** Profile columns shared by the lookups below. */
export const profileColumns = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    roles: roleIds.as("roles"),
};

/** Data access for the `user` table. */
export class UserMapper {
    constructor(private readonly executor: QueryExecutor = sqlExecutor) {}

    /**
     * Accounts whose email or id is `login`, with their stored password (hash, or legacy plain text) for
     * AuthService to verify. The stored password must never be returned to clients.
     */
    public findLoginCandidates(login: string): Promise<(UserProfile & { password: string })[]> {
        return this.executor.run(
            db.select({ ...profileColumns, password: user.password }).from(user)
                .where(or(eq(user.email, login), eq(user.id, login)))
                .limit(5),
        );
    }

    public setPassword(id: string, passwordHash: string): Promise<WriteResult> {
        return this.executor.run(db.update(user).set({ password: passwordHash }).where(eq(user.id, id)));
    }

    /** Accounts whose password is still stored in plain text (not yet an scrypt hash). */
    public findUnhashedPasswords(): Promise<{ id: string; password: string }[]> {
        return this.executor.run(
            db.select({ id: user.id, password: user.password }).from(user).where(notLike(user.password, "scrypt$%")),
        );
    }

    public async findByEmail(email: string): Promise<UserProfile | undefined> {
        const rows: UserProfile[] = await this.executor.run(db.select(profileColumns).from(user).where(eq(user.email, email)));
        return rows[0];
    }

    /** A member with their access roles as {id, name} objects. */
    public async findById(id: string) {
        const rows = await this.executor.run(
            db.select({
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                access: roleObjects.as("access"),
            }).from(user).where(eq(user.id, id)),
        );
        return rows[0];
    }

    public findByUserNameOrEmail(userName: string, email: string) {
        return this.executor.run<{ id: string }[]>(
            db.select({ id: user.id }).from(user).where(or(eq(user.username, userName), eq(user.email, email))),
        );
    }

    /** One page of members, optionally filtered by first or last name; every row carries the overall `total`. */
    public findPage({ offset, limit }: Page, nameFilter?: string) {
        const query = db.select({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            total: sql<number>`(SELECT count(*) FROM user)`.as("total"),
        }).from(user);

        if (nameFilter) {
            query.where(or(like(user.firstName, `%${nameFilter}%`), like(user.lastName, `%${nameFilter}%`)));
        }
        return this.executor.run(query.offset(offset).limit(limit));
    }

    public insert(values: NewUser): Promise<WriteResult> {
        const { userName, ...rest } = values;
        return this.executor.run(db.insert(user).values({ ...rest, username: userName, token: "" }));
    }

    public update(id: string, changes: UserChanges): Promise<WriteResult> {
        return this.executor.run(db.update(user).set(changes).where(eq(user.id, id)));
    }
}

export const userMapper = new UserMapper();
