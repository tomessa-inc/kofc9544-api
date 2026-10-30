import { ConflictError, NotFoundError } from "../errors";
import { PlayerMapper, playerMapper } from "../mapper/player.mapper";
import { PlayerYearMapper, playerYearMapper } from "../mapper/player-year.mapper";
import type { WriteResult } from "../mapper/types";
import { YearMapper, yearMapper } from "../mapper/year.mapper";
import { ListParams, toPage } from "../validators/list.validator";

type YearStore = Pick<YearMapper, "findPage" | "findByYear" | "findByPlayer" | "insert" | "insertIgnore">;
type PlayerYearStore = Pick<PlayerYearMapper, "insertIgnore" | "delete">;
type PlayerStore = Pick<PlayerMapper, "findById" | "findPageByYear">;

/** Which years each golf player was active. */
export class PlayerYearService {
    constructor(
        private readonly years: YearStore,
        private readonly playerYears: PlayerYearStore,
        private readonly players: PlayerStore,
    ) {}

    public listYears(params: ListParams) {
        return this.years.findPage(toPage(params));
    }

    /** Adds a year; it must not already exist. */
    public async createYear(value: number): Promise<{ id: number }> {
        const existing = await this.years.findByYear(value);
        if (existing.length > 0) throw new ConflictError(`Year ${value} already exists`);

        const { insertId } = await this.years.insert(value);
        return { id: insertId };
    }

    public listYearsForPlayer(playerId: number) {
        return this.years.findByPlayer(playerId);
    }

    /** One page of the players active in a year; empty for a year nobody has been marked active in. */
    public async listPlayers(value: number, params: ListParams) {
        const [found] = await this.years.findByYear(value);
        return found ? this.players.findPageByYear(found.id, toPage(params)) : [];
    }

    /** Marks a player active for a year, adding the year if it is new. */
    public async markActive(playerId: number, value: number): Promise<WriteResult> {
        const [player] = await this.players.findById(playerId);
        if (!player) throw new NotFoundError(`Player ${playerId} not found`);

        await this.years.insertIgnore(value);
        const [found] = await this.years.findByYear(value);
        return this.playerYears.insertIgnore(playerId, found!.id);
    }

    public async markInactive(playerId: number, value: number): Promise<WriteResult> {
        const [found] = await this.years.findByYear(value);
        return found ? this.playerYears.delete(playerId, found.id) : { affectedRows: 0 };
    }
}

export const playerYearService = new PlayerYearService(yearMapper, playerYearMapper, playerMapper);
