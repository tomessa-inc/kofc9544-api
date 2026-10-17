import type { TeamUpdateDto } from "../dto/golf.dto";
import { TeamMapper, teamMapper } from "../mapper/team.mapper";
import type { WriteResult } from "../mapper/types";
import { ListParams, toPage } from "../validators/list.validator";

type TeamStore = Pick<TeamMapper, "findPage" | "findNeedingPlayers" | "findNeedingPlayersAsOptions" | "update" | "delete">;

/** Team management for the admin screens. */
export class TeamService {
    constructor(private readonly teams: TeamStore) {}

    public list(params: ListParams) {
        return this.teams.findPage(toPage(params));
    }

    public listNeedingPlayers() {
        return this.teams.findNeedingPlayers();
    }

    public listNeedingPlayersAsOptions() {
        return this.teams.findNeedingPlayersAsOptions();
    }

    public update(id: string, changes: TeamUpdateDto): Promise<WriteResult> {
        return this.teams.update(id, changes);
    }

    public delete(id: string): Promise<WriteResult> {
        return this.teams.delete(id);
    }
}

export const teamService = new TeamService(teamMapper);
