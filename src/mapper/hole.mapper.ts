import { asc, desc, eq, lt, sql } from "drizzle-orm";
import { QueryExecutor, sqlExecutor } from "../db/executor";
import { db } from "../db/query-builder";
import { hole } from "../models/Hole";
import { team } from "../models/Team";
import { driverValues, type InsertResult, type LabelValue, type Page, type WriteResult } from "./types";

export type Hole = typeof hole.$inferSelect;
export interface NewHole {
    id: string;
    name: string;
    par: string;
}
export type HoleChanges = Partial<Pick<NewHole, "name" | "par">>;

/** A hole has room for teams until it has this many. */
export const MAX_TEAMS_PER_HOLE = 2;

const teamCount = sql<number>`count(${team.id})`;

/** Data access for the `hole` table. */
export class HoleMapper {
    constructor(private readonly executor: QueryExecutor = sqlExecutor) {}

    public insert(values: NewHole): Promise<InsertResult> {
        return this.executor.run(db.insert(hole).values(driverValues(values)));
    }

    public findByName(name: string): Promise<Hole[]> {
        return this.executor.run(db.select().from(hole).where(eq(hole.name, name)));
    }

    public update(id: string, changes: HoleChanges): Promise<WriteResult> {
        return this.executor.run(db.update(hole).set(driverValues(changes)).where(eq(hole.id, id)));
    }

    /** One page of holes ordered by name; every row carries the overall `total`. */
    public findPage({ offset, limit }: Page, order: "asc" | "desc") {
        return this.executor.run(
            db.select({
                id: hole.id,
                name: hole.name,
                par: hole.par,
                total: sql<number>`(SELECT count(*) FROM hole)`.as("total"),
            }).from(hole).orderBy(order === "asc" ? asc(hole.name) : desc(hole.name)).offset(offset).limit(limit),
        );
    }

    /** Holes with fewer than MAX_TEAMS_PER_HOLE teams, as select options. */
    public findNeedingTeamsAsOptions(): Promise<(LabelValue & { countTeams: number; total: number })[]> {
        return this.executor.run(
            db.select({
                value: sql<string>`${hole.id}`.as("value"),
                label: sql<string>`${hole.name}`.as("label"),
                countTeams: teamCount.as("countTeams"),
                total: sql<number>`(SELECT count(*) FROM hole)`.as("total"),
            })
                .from(hole)
                .leftJoin(team, eq(hole.id, team.hole))
                .groupBy(hole.id, hole.name)
                .having(lt(teamCount, MAX_TEAMS_PER_HOLE)),
        );
    }
}

export const holeMapper = new HoleMapper();
