import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { QueryExecutor, sqlExecutor } from "../db/executor";
import { db } from "../db/query-builder";
import { player } from "../models/Player";
import { playerYear } from "../models/PlayerYear";
import type { InsertResult, LabelValue, Page, WriteResult } from "./types";

export type Player = typeof player.$inferSelect;
export interface NewPlayer {
    name: string;
    email: string;
    phone: string;
    firstName?: string | null;
    lastName?: string | null;
    TeamId?: string | null;
    individual?: boolean | null;
    allergies?: string | null;
    payment?: string | null;
    member?: string | null;
}
export type PlayerChanges = Partial<Pick<NewPlayer, "name" | "email" | "phone" | "TeamId" | "allergies">>;

/** Data access for the `player` table. */
export class PlayerMapper {
    constructor(private readonly executor: QueryExecutor = sqlExecutor) {}

    public findByNameAndEmail(name: string, email: string): Promise<Player[]> {
        return this.executor.run(db.select().from(player).where(and(eq(player.name, name), eq(player.email, email))));
    }

    public findById(id: number): Promise<Player[]> {
        return this.executor.run(db.select().from(player).where(eq(player.id, id)));
    }

    public insert(values: NewPlayer): Promise<InsertResult> {
        return this.executor.run(db.insert(player).values(values));
    }

    public update(id: number, changes: PlayerChanges): Promise<WriteResult> {
        return this.executor.run(db.update(player).set(changes).where(eq(player.id, id)));
    }

    public delete(id: number): Promise<WriteResult> {
        return this.executor.run(db.delete(player).where(eq(player.id, id)));
    }

    /** One page of players; every row carries the overall `total`. */
    public findPage({ offset, limit }: Page) {
        return this.executor.run(
            db.select({
                id: player.id,
                name: player.name,
                email: player.email,
                phone: player.phone,
                TeamId: player.TeamId,
                individual: player.individual,
                allergies: player.allergies,
                payment: player.payment,
                member: player.member,
                total: sql<number>`(SELECT count(*) FROM player)`.as("total"),
            }).from(player).offset(offset).limit(limit),
        );
    }

    /** Players on a team; every row carries that team's player `total`. */
    public findByTeam(teamId: string) {
        return this.executor.run(
            db.select({
                id: player.id,
                name: player.name,
                email: player.email,
                phone: player.phone,
                TeamId: player.TeamId,
                total: sql<number>`(SELECT count(*) FROM player AS p WHERE p.TeamId = ${teamId})`.as("total"),
            }).from(player).where(eq(player.TeamId, teamId)),
        );
    }

    /** One page of the players active in a year; every row carries that year's player `total`. */
    public findPageByYear(yearId: number, { offset, limit }: Page) {
        const active = db.select({ playerId: playerYear.playerId }).from(playerYear).where(eq(playerYear.yearId, yearId));
        return this.executor.run(
            db.select({
                id: player.id,
                name: player.name,
                email: player.email,
                phone: player.phone,
                TeamId: player.TeamId,
                total: sql<number>`(SELECT count(*) FROM player_year WHERE player_year.YearId = ${yearId})`.as("total"),
            }).from(player).where(inArray(player.id, active)).offset(offset).limit(limit),
        );
    }

    /** Players not yet on a team, as select options. */
    public findWithoutTeamAsOptions(): Promise<LabelValue[]> {
        return this.executor.run(
            db.select({ value: player.id, label: player.name }).from(player).where(isNull(player.TeamId)),
        );
    }

    /** Every player with their hole, for the CSV export, ordered by last name. */
    public findForExport(order: "asc" | "desc") {
        return this.executor.run(
            db.select({
                id: player.id,
                name: player.name,
                email: player.email,
                team: player.TeamId,
                hole: sql<string>`(SELECT hole.name FROM hole INNER JOIN team ON team.hole = hole.id WHERE team.id = player.TeamId)`.as("hole"),
                lastName: player.lastName,
                firstName: player.firstName,
                total: sql<number>`(SELECT count(*) FROM player)`.as("total"),
            }).from(player).orderBy(order === "asc" ? asc(player.lastName) : desc(player.lastName)),
        );
    }
}

export const playerMapper = new PlayerMapper();
