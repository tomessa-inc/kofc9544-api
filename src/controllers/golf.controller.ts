import { getRouterParams, readBody } from "h3";
import { BadRequestError } from "../errors";
import { holeService } from "../service/hole.service";
import { playerImportService } from "../service/player-import.service";
import { playerService } from "../service/player.service";
import { registrationService } from "../service/registration.service";
import { teamService } from "../service/team.service";
import { useResponseSuccess } from "../utils/response";
import {
    validateHole,
    validateNewPlayer,
    validatePlayerUpdate,
    validateRegistration,
    validateTeamUpdate,
} from "../validators/golf.validator";
import { validateNumericId, validateTextId } from "../validators/id.validator";
import { parseListParams } from "../validators/list.validator";
import { controller, pagedList, routeOrBodyId } from "./controller";

type Body = Record<string, unknown> | undefined;

/** Golf tournament endpoints: registration, players, teams, holes, and the player import. */
export class GolfController {
    // Registration

    public static apiRegisterTournament = controller(async (event) => {
        const registration = validateRegistration(await readBody<Body>(event));
        const { emailSent } = await registrationService.register(registration);
        return useResponseSuccess({ message: "Registration successful", emailSent });
    });

    // Players

    public static apiGetAllPlayers = controller(async (event) => {
        const params = parseListParams(getRouterParams(event));
        return pagedList(await playerService.list(params), params, "name");
    });

    public static apiGetPlayersByTeamId = controller(async (event) => {
        const params = parseListParams(getRouterParams(event));
        const teamId = validateTextId(String(params.id ?? ""), "team id");
        return pagedList(await playerService.listByTeam(teamId), params, "name");
    });

    /** Players without a team, as select options (a plain array, not the paged envelope). */
    public static getAllPlayersNeedingTeamsLabelValue = controller(async () => {
        return playerService.listWithoutTeamAsOptions();
    });

    public static getPlayerCSV = controller(async (event) => {
        const params = parseListParams(getRouterParams(event));
        return pagedList(await playerService.listForExport(params), params, "name");
    });

    public static apiCreatePlayer = controller(async (event) => {
        const player = validateNewPlayer(await readBody<Body>(event));
        return useResponseSuccess(await playerService.create(player));
    });

    public static apiUpdatePlayedById = controller(async (event) => {
        const id = validateNumericId(getRouterParams(event).id, "player id");
        const changes = validatePlayerUpdate(await readBody<Body>(event));
        return useResponseSuccess(await playerService.update(id, changes));
    });

    public static apiDeletePlayer = controller(async (event) => {
        const id = validateNumericId(getRouterParams(event).playerId, "player id");
        return useResponseSuccess(await playerService.delete(id));
    });

    public static apiImportPlayers = controller(async (event) => {
        const file = (await event.req.formData()).get("file");
        if (!(file instanceof File)) {
            throw new BadRequestError("No file provided");
        }
        return useResponseSuccess(await playerImportService.import(await file.text()));
    });

    // Teams

    public static apiGetAllTeams = controller(async (event) => {
        const params = parseListParams(getRouterParams(event));
        return pagedList(await teamService.list(params), params, "name");
    });

    public static apiGetTeamsMissingPlayers = controller(async (event) => {
        const params = parseListParams(getRouterParams(event));
        return pagedList(await teamService.listNeedingPlayers(), params, "name");
    });

    public static getAllTeamsNeedingPlayersLabelValue = controller(async (event) => {
        const params = parseListParams(getRouterParams(event), { sort: "label" });
        return pagedList(await teamService.listNeedingPlayersAsOptions(), params, "label");
    });

    public static apiUpdateTeamById = controller(async (event) => {
        const body = await readBody<Body>(event);
        const id = validateTextId(routeOrBodyId(getRouterParams(event).id, body), "team id");
        return useResponseSuccess(await teamService.update(id, validateTeamUpdate(body)));
    });

    public static apiDeleteTeam = controller(async (event) => {
        const id = validateTextId(getRouterParams(event).teamId, "team id");
        return useResponseSuccess(await teamService.delete(id));
    });

    /** Teams are created by registration and import; this route is reserved and does nothing. */
    public static apiCreateTeam = controller(async () => {
        return useResponseSuccess(null);
    });

    // Holes

    public static apiGetAllHoles = controller(async (event) => {
        const params = parseListParams(getRouterParams(event));
        return pagedList(await holeService.list(params), params, "name");
    });

    public static getAllHolesNeedingTeamsLabelValue = controller(async (event) => {
        const params = parseListParams(getRouterParams(event), { sort: "value" });
        return pagedList(await holeService.listNeedingTeamsAsOptions(), params, "value");
    });

    public static apiCreateHole = controller(async (event) => {
        const hole = validateHole(await readBody<Body>(event));
        return useResponseSuccess(await holeService.create(hole));
    });

    public static apiUpdateHoleById = controller(async (event) => {
        const body = await readBody<Body>(event);
        const id = validateTextId(routeOrBodyId(getRouterParams(event).id, body), "hole id");
        return useResponseSuccess(await holeService.update(id, validateHole(body)));
    });
}
