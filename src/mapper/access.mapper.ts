import { eq, sql } from "drizzle-orm";
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

/** Data access for access roles (`access`). */
export class AccessMapper {
    constructor(private readonly executor: QueryExecutor = sqlExecutor) {}

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

    public findByName(name: string): Promise<Access[]> {
        return this.executor.run(db.select().from(access).where(eq(access.name, name)));
    }

    public insert(values: NewAccess): Promise<WriteResult> {
        return this.executor.run(db.insert(access).values(values));
    }
}

export const accessMapper = new AccessMapper();
