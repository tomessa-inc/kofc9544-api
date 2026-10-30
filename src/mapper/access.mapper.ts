import { asc, eq, or, sql } from "drizzle-orm";
import { QueryExecutor, sqlExecutor } from "../db/executor";
import { db } from "../db/query-builder";
import { access } from "../models/Access";
import type { Page, WriteResult } from "./types";

export type Access = typeof access.$inferSelect;
export interface NewAccess {
    id: string;
    name: string;
    description: string;
}
export type AccessChanges = Pick<NewAccess, "name" | "description">;

/** Data access for access roles (`access`). */
export class AccessMapper {
    constructor(private readonly executor: QueryExecutor = sqlExecutor) {}

    /** Every role, by name (the role list is short, so it is not paged). */
    public findAll(): Promise<Access[]> {
        return this.executor.run(
            db.select({ id: access.id, name: access.name, description: access.description }).from(access).orderBy(asc(access.name)),
        );
    }

    /** One page of roles; every row carries the overall `total`. */
    public findPage({ offset, limit }: Page) {
        return this.executor.run<(Access & { total: number })[]>(
            db.select({
                id: access.id,
                name: access.name,
                description: access.description,
                total: sql<number>`(SELECT count(*) FROM access)`.as("total"),
            }).from(access).limit(limit).offset(offset),
        );
    }

    /** Roles whose id or name matches (used to detect an existing role before creating one). */
    public findByIdOrName(id: string, name: string): Promise<Access[]> {
        return this.executor.run(db.select().from(access).where(or(eq(access.id, id), eq(access.name, name))));
    }

    public insert(values: NewAccess): Promise<WriteResult> {
        return this.executor.run(db.insert(access).values(values));
    }

    public update(id: string, changes: AccessChanges): Promise<WriteResult> {
        return this.executor.run(db.update(access).set(changes).where(eq(access.id, id)));
    }

    public delete(id: string): Promise<WriteResult> {
        return this.executor.run(db.delete(access).where(eq(access.id, id)));
    }
}

export const accessMapper = new AccessMapper();
