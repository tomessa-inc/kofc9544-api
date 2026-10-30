import { and, eq } from "drizzle-orm";
import { QueryExecutor, sqlExecutor } from "../db/executor";
import { db } from "../db/query-builder";
import { playerYear } from "../models/PlayerYear";
import type { WriteResult } from "./types";

/** Data access for which years each player was active (`player_year`). */
export class PlayerYearMapper {
    constructor(private readonly executor: QueryExecutor = sqlExecutor) {}

    /** Marks the player active for the year; does nothing if they already are. */
    public insertIgnore(playerId: number, yearId: number): Promise<WriteResult> {
        return this.executor.run(db.insert(playerYear).ignore().values({ playerId, yearId }));
    }

    public delete(playerId: number, yearId: number): Promise<WriteResult> {
        return this.executor.run(db.delete(playerYear).where(and(eq(playerYear.playerId, playerId), eq(playerYear.yearId, yearId))));
    }
}

export const playerYearMapper = new PlayerYearMapper();
