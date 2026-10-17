import type { NewPlayerDto, PlayerUpdateDto } from "../dto/golf.dto";
import { PlayerMapper, playerMapper } from "../mapper/player.mapper";
import type { WriteResult } from "../mapper/types";
import { ListParams, sortDirection, toPage } from "../validators/list.validator";
import { GolfMailer, mailService } from "./mail.service";

type PlayerStore = Pick<PlayerMapper, "insert" | "update" | "delete" | "findPage" | "findByTeam" | "findWithoutTeamAsOptions" | "findForExport">;

/** Golfer management for the admin screens. */
export class PlayerService {
    constructor(
        private readonly players: PlayerStore,
        private readonly mailer: GolfMailer,
    ) {}

    public list(params: ListParams) {
        return this.players.findPage(toPage(params));
    }

    public listByTeam(teamId: string) {
        return this.players.findByTeam(teamId);
    }

    public listWithoutTeamAsOptions() {
        return this.players.findWithoutTeamAsOptions();
    }

    public listForExport(params: ListParams) {
        return this.players.findForExport(sortDirection(params.order));
    }

    /** Add a player to a team and send them their payment reference id. */
    public async create(dto: NewPlayerDto): Promise<{ id: number; emailSent: boolean }> {
        const player = {
            name: dto.name,
            email: dto.email,
            phone: dto.phone,
            individual: false,
            TeamId: dto.TeamId ?? null,
            allergies: dto.allergies ?? null,
            payment: null,
            member: null,
        };
        const { insertId } = await this.players.insert(player);

        try {
            await this.mailer.sendPlayerConfirmation({ ...player, id: insertId });
            return { id: insertId, emailSent: true };
        } catch (error) {
            console.error(`Player confirmation email not sent: ${error}`);
            return { id: insertId, emailSent: false };
        }
    }

    public update(id: number, changes: PlayerUpdateDto): Promise<WriteResult> {
        return this.players.update(id, changes);
    }

    public delete(id: number): Promise<WriteResult> {
        return this.players.delete(id);
    }
}

export const playerService = new PlayerService(playerMapper, mailService);
