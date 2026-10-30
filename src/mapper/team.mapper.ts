import { eq, lt, or, sql } from "drizzle-orm";
import { QueryExecutor, sqlExecutor } from "../db/executor";
import { db } from "../db/query-builder";
import { player } from "../models/Player";
import { team } from "../models/Team";
import type { LabelValue, Page, WriteResult } from "./types";

export type Team = typeof team.$inferSelect;
export interface NewTeam {
    id: string;
    name: string;
    captain: string;
    hole?: string;
}
export type TeamChanges = Pick<Partial<NewTeam>, "name" | "captain" | "hole">;

/** A team has room for players until it has this many. */
export const MAX_TEAM_SIZE = 4;

const playerCount = sql<number>`count(${player.id})`;
// Correlated subqueries name the outer columns literally: Drizzle renders ${team.x} unqualified in a
// single-table select, and an unqualified `id` inside the subquery would bind to the subquery's table.
const holeName = sql<string>`(SELECT hole.name FROM hole WHERE hole.id = team.hole)`;

/** Data access for the `team` table. */
export class TeamMapper {
    constructor(private readonly executor: QueryExecutor = sqlExecutor) {}

    /** Teams whose id or name matches (used to detect an existing team before creating one). */
    public findByIdOrName(id: string, name: string = id): Promise<Team[]> {
        return this.executor.run(db.select().from(team).where(or(eq(team.id, id), eq(team.name, name))));
    }

    public insert(values: NewTeam): Promise<WriteResult> {
        return this.executor.run(db.insert(team).values(values));
    }

    public update(id: string, changes: TeamChanges): Promise<WriteResult> {
        return this.executor.run(db.update(team).set(changes).where(eq(team.id, id)));
    }

    public delete(id: string): Promise<WriteResult> {
        return this.executor.run(db.delete(team).where(eq(team.id, id)));
    }

    /** One page of teams with player count, hole and par; every row carries the overall `total`. */
    public findPage({ offset, limit }: Page) {
        return this.executor.run(
            db.select({
                id: team.id,
                name: team.name,
                captain: team.captain,
                countPlayers: sql<number>`(SELECT count(*) FROM player WHERE player.TeamId = team.id)`.as("countPlayers"),
                hole: holeName.as("hole"),
                par: sql<string>`(SELECT hole.par FROM hole WHERE hole.id = team.hole)`.as("par"),
                total: sql<number>`(SELECT count(*) FROM team)`.as("total"),
            }).from(team).offset(offset).limit(limit),
        );
    }

    /** Teams with fewer than MAX_TEAM_SIZE players, including empty teams. */
    public findNeedingPlayers() {
        return this.executor.run(
            db.select({ id: team.id, name: team.name, countPlayers: playerCount.as("countPlayers") })
                .from(team)
                .leftJoin(player, eq(team.id, player.TeamId))
                .groupBy(team.id, team.name)
                .having(lt(playerCount, MAX_TEAM_SIZE)),
        );
    }

    /** Teams with room for players, as select options labelled "<team>-<hole>". */
    public findNeedingPlayersAsOptions(): Promise<(LabelValue & { countPlayers: number; hole: string; total: number })[]> {
        return this.executor.run(
            db.select({
                value: sql<string>`${team.id}`.as("value"),
                label: sql<string>`CONCAT(${team.name}, '-', ${holeName})`.as("label"),
                countPlayers: playerCount.as("countPlayers"),
                total: sql<number>`(SELECT count(*) FROM team)`.as("total"),
                hole: holeName.as("hole"),
            })
                .from(team)
                .leftJoin(player, eq(team.id, player.TeamId))
                .groupBy(team.id, team.name)
                .having(lt(playerCount, MAX_TEAM_SIZE)),
        );
    }
}

export const teamMapper = new TeamMapper();
