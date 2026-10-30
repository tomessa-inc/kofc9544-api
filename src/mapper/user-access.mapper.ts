import { eq } from "drizzle-orm";
import { QueryExecutor, sqlExecutor } from "../db/executor";
import { db } from "../db/query-builder";
import { userAccess } from "../models/UserAccess";
import type { WriteResult } from "./types";

/** Data access for role assignments (`user_access`). */
export class UserAccessMapper {
    constructor(private readonly executor: QueryExecutor = sqlExecutor) {}

    /** Takes a role away from every user who has it. */
    public deleteByAccess(accessId: string): Promise<WriteResult> {
        return this.executor.run(db.delete(userAccess).where(eq(userAccess.accessId, accessId)));
    }
}

export const userAccessMapper = new UserAccessMapper();
