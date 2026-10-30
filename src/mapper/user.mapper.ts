import { and, eq, like, notLike, or, SQL, sql } from "drizzle-orm";
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

/** Optional user-list filters; each matches anywhere in its column. */
export interface UserFilters {
    /** first or last name */
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
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

    /** One page of members matching the filters; every row carries the filtered `total`. */
    public async findPage({ offset, limit }: Page, filters: UserFilters = {}) {
        const conditions: (SQL | undefined)[] = [];
        if (filters.name) conditions.push(or(like(user.firstName, `%${filters.name}%`), like(user.lastName, `%${filters.name}%`)));
        if (filters.firstName) conditions.push(like(user.firstName, `%${filters.firstName}%`));
        if (filters.lastName) conditions.push(like(user.lastName, `%${filters.lastName}%`));
        if (filters.email) conditions.push(like(user.email, `%${filters.email}%`));
        const where = conditions.length > 0 ? and(...conditions) : undefined;

        const [rows, counts] = await Promise.all([
            this.executor.run<Omit<UserProfile, "roles">[]>(
                db.select({
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                }).from(user).where(where).offset(offset).limit(limit),
            ),
            this.executor.run<{ total: number }[]>(db.select({ total: sql<number>`count(*)` }).from(user).where(where)),
        ]);
        const total = Number(counts?.[0]?.total ?? 0);
        return (rows ?? []).map((row) => ({ ...row, total }));
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
