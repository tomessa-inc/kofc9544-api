import type { RegistrationDto } from "../dto/golf.dto";
import { ConflictError } from "../errors";
import { PlayerMapper, playerMapper } from "../mapper/player.mapper";
import { TeamMapper, teamMapper } from "../mapper/team.mapper";
import { slugify } from "../utils/slug";
import { GolfMailer, mailService, type PlayerConfirmation } from "./mail.service";

type TeamStore = Pick<TeamMapper, "findByIdOrName" | "insert">;
type PlayerStore = Pick<PlayerMapper, "insert">;

export interface RegistrationResult {
    teamId: string | undefined;
    playerIds: number[];
    emailSent: boolean;
}

/**
 * Tournament registration: two or more players form a team, one registers individually. Each player
 * gets a confirmation with their payment reference id, and the organizers get a notice.
 */
export class RegistrationService {
    constructor(
        private readonly teams: TeamStore,
        private readonly players: PlayerStore,
        private readonly mailer: GolfMailer,
    ) {}

    public async register(registration: RegistrationDto): Promise<RegistrationResult> {
        const teamId = registration.players.length >= 2 ? await this.createTeam(registration) : undefined;

        const created: PlayerConfirmation[] = [];
        for (const entry of registration.players) {
            const player = {
                name: entry.player,
                email: entry.email,
                phone: entry.phone,
                individual: teamId === undefined,
                TeamId: teamId ?? null,
                allergies: entry.allergies ?? null,
                payment: registration.payment === undefined ? null : String(registration.payment),
                member: registration.member ?? null,
            };
            const { insertId } = await this.players.insert(player);
            created.push({ ...player, id: insertId });
        }

        // Everything is saved at this point; a mail failure must not fail (and invite a duplicate) registration.
        const emailSent = await this.notify(created, registration);
        return { teamId, playerIds: created.map((p) => p.id), emailSent };
    }

    private async createTeam(registration: RegistrationDto): Promise<string> {
        const name = registration.team_name?.trim() || registration.players[0].player;
        const id = slugify(name);

        if ((await this.teams.findByIdOrName(id, name)).length > 0) {
            throw new ConflictError(`Team name "${name}" already exists`);
        }

        await this.teams.insert({ id, name, captain: registration.players[0].player });
        return id;
    }

    private async notify(players: PlayerConfirmation[], registration: RegistrationDto): Promise<boolean> {
        try {
            for (const player of players) {
                await this.mailer.sendPlayerConfirmation(player);
            }
            await this.mailer.sendRegistrationNotice(registration);
            return true;
        } catch (error) {
            console.error(`Registration email not sent: ${error}`);
            return false;
        }
    }
}

export const registrationService = new RegistrationService(teamMapper, playerMapper, mailService);
