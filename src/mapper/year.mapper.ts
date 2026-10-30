import { desc, eq, inArray, sql } from "drizzle-orm";
import { QueryExecutor, sqlExecutor } from "../db/executor";
import { db } from "../db/query-builder";
import { playerYear } from "../models/PlayerYear";
import { year } from "../models/Year";
import type { InsertResult, Page, WriteResult } from "./types";

export type Year = typeof year.$inferSelect;

/** Data access for the `year` table. */
export class YearMapper {
    constructor(private readonly executor: QueryExecutor = sqlExecutor) {}

    /** One page of years, newest first, each with its active player count; every row carries the overall `total`. */
    public findPage({ offset, limit }: Page) {
        return this.executor.run(
            db.select({
                id: year.id,
                year: year.year,
                players: sql<number>`(SELECT count(*) FROM player_year WHERE player_year.YearId = year.id)`.as("players"),
                total: sql<number>`(SELECT count(*) FROM year)`.as("total"),
            }).from(year).orderBy(desc(year.year)).offset(offset).limit(limit),
        );
    }

    public findByYear(value: number): Promise<Year[]> {
        return this.executor.run(db.select().from(year).where(eq(year.year, value)));
    }

    /** Years a player was active, newest first. */
    public findByPlayer(playerId: number): Promise<Year[]> {
        const active = db.select({ yearId: playerYear.yearId }).from(playerYear).where(eq(playerYear.playerId, playerId));
        return this.executor.run(db.select().from(year).where(inArray(year.id, active)).orderBy(desc(year.year)));
    }

    public insert(value: number): Promise<InsertResult> {
        return this.executor.run(db.insert(year).values({ year: value }));
    }

    /** Adds the year; does nothing if it already exists. */
    public insertIgnore(value: number): Promise<WriteResult> {
        return this.executor.run(db.insert(year).ignore().values({ year: value }));
    }
}

export const yearMapper = new YearMapper();
