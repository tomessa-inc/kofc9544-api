import type { ImportResult, ImportRow } from "../dto/golf.dto";
import { BadRequestError } from "../errors";
import { HoleMapper, holeMapper } from "../mapper/hole.mapper";
import { PlayerMapper, playerMapper } from "../mapper/player.mapper";
import { TeamMapper, teamMapper } from "../mapper/team.mapper";
import { slugify } from "../utils/slug";

type HoleStore = Pick<HoleMapper, "findByName">;
type TeamStore = Pick<TeamMapper, "findByIdOrName" | "insert">;
type PlayerStore = Pick<PlayerMapper, "findByNameAndEmail" | "insert">;

/** Parse the registration CSV export: first line is the header, blank lines are ignored. */
export function parseImportCsv(text: string): ImportRow[] {
    const [header = "", ...lines] = text.split(/\r?\n/);
    const keys = header.split(",").map((key) => key.trim());

    return lines
        .filter((line) => line.trim())
        .map((line) => {
            const values = line.split(",");
            return Object.fromEntries(keys.map((key, i) => [key, values[i]?.trim() ?? ""])) as ImportRow;
        });
}

/**
 * Imports players from the registration spreadsheet. Rows with a TEAM NAME join (or create) that team;
 * rows without one are grouped into a team per run of consecutive rows on the same hole, named after the
 * run's first player. Players already registered (same name and email) are skipped.
 */
export class PlayerImportService {
    constructor(
        private readonly holes: HoleStore,
        private readonly teams: TeamStore,
        private readonly players: PlayerStore,
    ) {}

    public async import(csv: string): Promise<ImportResult> {
        const rows = parseImportCsv(csv).filter((row) => row["FIRST NAME"]);
        // Resolve every hole first so an unknown hole rejects the file before anything is written.
        const holeIds = await this.resolveHoles(rows);

        const result: ImportResult = { teamsCreated: 0, playersCreated: 0 };
        let soloTeam: { holeId: string; teamId: string } | undefined;

        for (const row of rows) {
            const fullName = `${row["FIRST NAME"]} ${row["LAST NAME"] ?? ""}`.trim();
            const holeId = holeIds.get(row.HOLE ?? "")!;
            const teamName = row["TEAM NAME"] || undefined;

            let teamId: string;
            if (teamName) {
                teamId = await this.findOrCreateTeam(slugify(teamName), teamName, row["FIRST NAME"]!, holeId, result);
            } else {
                if (!soloTeam || soloTeam.holeId !== holeId) {
                    soloTeam = { holeId, teamId: slugify(fullName) };
                }
                teamId = await this.findOrCreateTeam(soloTeam.teamId, fullName, row["FIRST NAME"]!, holeId, result);
                soloTeam.teamId = teamId;
            }

            if ((await this.players.findByNameAndEmail(fullName, row.EMAIL ?? "")).length === 0) {
                await this.players.insert({
                    name: fullName,
                    email: row.EMAIL ?? "",
                    firstName: row["FIRST NAME"],
                    lastName: row["LAST NAME"],
                    phone: row.PHONE ?? "",
                    TeamId: teamId,
                });
                result.playersCreated++;
            }
        }
        return result;
    }

    private async resolveHoles(rows: ImportRow[]): Promise<Map<string, string>> {
        const holeIds = new Map<string, string>();
        const missing: string[] = [];

        for (const row of rows) {
            const name = row.HOLE ?? "";
            if (!holeIds.has(name)) {
                const id = (await this.holes.findByName(name))?.[0]?.id;
                if (id) holeIds.set(name, id);
            }
            if (!holeIds.has(name)) {
                missing.push(`"${name}" (${row["FIRST NAME"]} ${row["LAST NAME"] ?? ""})`.replace(" )", ")"));
            }
        }

        if (missing.length > 0) {
            throw new BadRequestError(`Unknown hole(s), nothing was imported: ${missing.join(", ")}`);
        }
        return holeIds;
    }

    /** Existing team's id, or the id of a team created now. */
    private async findOrCreateTeam(id: string, name: string, captain: string, holeId: string, result: ImportResult): Promise<string> {
        const existing = await this.teams.findByIdOrName(id, name);
        if (existing.length > 0) return existing[0].id;

        await this.teams.insert({ id, name, captain, hole: holeId });
        result.teamsCreated++;
        return id;
    }
}

export const playerImportService = new PlayerImportService(holeMapper, teamMapper, playerMapper);
