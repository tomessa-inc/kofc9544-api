import { defineEventHandler, readBody, getRouterParams, setResponseStatus } from "h3";
import {mailMapper, golfMapper, teamMapper, holeMapper} from "../mapper/";
import { EmailMessaging } from "../models/EmailMessaging";
import { useResponseError, useResponseSuccess } from "../utils/response";
import moment from "moment";

export interface OptionsPlayer {
    team_name?: string;
    players: {
        player: string;
        email: string;
        phone: string;
        allergies?: string;
    }[];
    body?: string;
    TeamId?: string;
    individual?: boolean;
    email_type: string;
    payment?: number;
    member?: string;
}

// Helper to parse route params into options object
function parseParams(params: Record<string, string>, defaults: Record<string, any>) {
    const options = { ...defaults };
    Object.entries(params).forEach(([key, value]) => {
        if (value !== "undefined") {
            options[key] = isNaN(Number(value)) ? value : Number(value);
        }
    });
    return options;
}

export class GolfController {

    public static apiRegisterTournament = defineEventHandler(async (event) => {
        try {
            const body = await readBody(event);
            const optionsPlayer: OptionsPlayer = { ...body, individual: true };

            if (optionsPlayer.players.length >= 2) {
                const team = await teamMapper.createTeamRegistration(optionsPlayer);

                if (!team.success) {
                    setResponseStatus(event, 409);
                    return useResponseError("Conflict", team.message );
                  //  return useResponseError("BadRequestException", team.message);
                }

                if (team.data.affectedRows === 1) {
                    optionsPlayer.TeamId = team.data.id;
                    optionsPlayer.individual = false;
                } else {
                    setResponseStatus(event, 500);
                    return useResponseError("InternalServerError", "Team name already exists");
                }
            }

            await golfMapper.createPlayerRegistration(optionsPlayer);
            await mailMapper.setupEmail({ email_type: EmailMessaging.EMAIL_TYPE_REGISTER, data: body });

            return useResponseSuccess({ message: "Registration successful" });
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static getAllHolesNeedingTeamsLabelValue = defineEventHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const options = parseParams(params, {
                pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: golfMapper.VALUE_SORT, order: golfMapper.DEFAULT_ORDER,
            });

            const teams = await holeMapper.getAllHolesNeedingTeamsLabelValue(options);

            if (typeof teams === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", teams);
            }

            return golfMapper.prepareListResults(teams, options);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static getAllTeamsNeedingPlayersLabelValue = defineEventHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const options = parseParams(params, {
                pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: golfMapper.LABEL_SORT, order: golfMapper.DEFAULT_ORDER,
            });

            const teams = await teamMapper.getAllTeamsNeedingPlayersLabelValue(options);

            if (typeof teams === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", teams);
            }

            return golfMapper.prepareListResults(teams, options);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static getAllPlayersNeedingTeamsLabelValue = defineEventHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const options = parseParams(params, {
                pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: golfMapper.LABEL_SORT, order: golfMapper.DEFAULT_ORDER,
            });

            const teams = await golfMapper.getAllPlayersNeedingTeamsLabelValue(options);

            if (typeof teams === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", teams);
            }

            return teams;
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiGetTeamsMissingPlayers = defineEventHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const options = parseParams(params, {
                pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: golfMapper.DEFAULT_SORT, order: golfMapper.DEFAULT_ORDER,
            });

            const galleries = await teamMapper.getAllTeamsNeedingPlayers(options);

            if (typeof galleries === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", galleries);
            }

            return golfMapper.prepareListResults(galleries, options);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiGetAllHoles = defineEventHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            console.log("the params")
            console.log(params)
            const options = parseParams(params, {
                pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: golfMapper.DEFAULT_SORT, order: golfMapper.DEFAULT_ORDER,
            });
            console.log("the options")
            console.log(options)


            const holes = await holeMapper.getAllHoles(options);
            console.log("the holes")
            console.log(holes)
            if (typeof holes === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", holes);
            }
            console.log("sdasdf")
            return golfMapper.prepareListResults(holes, options);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiGetAllPlayers = defineEventHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const options = parseParams(params, {
                pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: golfMapper.DEFAULT_SORT, order: golfMapper.DEFAULT_ORDER,
            });

            const players = await golfMapper.getAllPlayers(options);

            if (typeof players === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", players);
            }

            return golfMapper.prepareListResults(players, options);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiGetAllTeams = defineEventHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const options = parseParams(params, {
                pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: golfMapper.DEFAULT_SORT, order: golfMapper.DEFAULT_ORDER,
            });

            const teams = await teamMapper.getAllTeams(options);

            if (typeof teams === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", teams);
            }

            return teamMapper.prepareListResults(teams, options);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiUpdatePlayedById = defineEventHandler(async (event) => {
        try {
            const { id } = getRouterParams(event);
            const body = await readBody(event);

            const result = await golfMapper.updatePlayerById(body, id);

            if (typeof result === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", result);
            }

            return useResponseSuccess(result);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });


    public static apiCreatePlayer = defineEventHandler(async (event) => {
        try {
            const body = await readBody(event);
            console.log("the body")
            console.log(body);
            const bodyArray: OptionsPlayer = {
                TeamId: body.TeamId,
                players: [{
                    player: body.name,
                   email: body.email,
                   phone: body.phone,
                    allergies: body.allergies,
                }],
                individual: false,
                email_type:"register"
            }
            console.log("defiend")
            console.log(bodyArray)
//            bodyArray.push(body);

            const result = await golfMapper.createPlayerRegistration(bodyArray);

            if (typeof result === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", result);
            }

            return useResponseSuccess(result);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });


    public static apiGetPlayersByTeamId = defineEventHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const options = parseParams(params, {
                id: null, pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: golfMapper.DEFAULT_SORT, order: golfMapper.DEFAULT_ORDER,
            });

            const players = await golfMapper.getPlayersByTeamId(options);

            if (typeof players === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", players);
            }

            return teamMapper.prepareListResults(players, options);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });



    public static apiCreateTeam = defineEventHandler(async (event) => {
        try {
            const body = await readBody(event);

            console.log("the body")
            console.log(body);
            const bodyArray: OptionsPlayer = {
                TeamId: body.TeamId,
                players: [{
                    player: body.name,
                    email: body.email,
                    phone: body.phone,
                    allergies: body.allergies,
                }],
                individual: false,
                email_type:"register"
            }
            console.log("defeddd")
            console.log(bodyArray)
//            bodyArray.push(body);
/*
       //     const result = await teamMapper.createTeamRegistration()

            if (typeof result === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", result);
            }
*/
            return useResponseSuccess(event);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });



    public static apiCreateHole = defineEventHandler(async (event) => {
        try {
            const body = await readBody(event);

            console.log("the body")
            console.log(body);
            const params = {

            }
            const bodyArray: OptionsPlayer = {
                TeamId: body.TeamId,
                players: [{
                    player: body.name,
                    email: body.email,
                    phone: body.phone,
                    allergies: body.allergies,
                }],
                individual: false,
                email_type:"register"
            }
            body.id = body.name.replace(/\s+/g, '-').toLowerCase()
            console.log("defiend")
            await holeMapper.createHole(body)

            return useResponseSuccess(event);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiUpdateTeamById = defineEventHandler(async (event) => {
        try {
            const body = await readBody(event);
            const {id} = body;
            console.log("the body")
            console.log(body);
            console.log("the id")
            console.log(id);
            const bodyArray = {
                id: body.id,
                name: body.name,
                captain: body.captain,
                hole: body.hole,
            }

            console.log("defiend")
            console.log(bodyArray)
//            bodyArray.push(body);

            const result = await teamMapper.updateTeamById(bodyArray, id);

            if (typeof result === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", result);
            }

            return useResponseSuccess(result);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });


    public static apiUpdateHoleById = defineEventHandler(async (event) => {
        try {
            const body = await readBody(event);
            const {id} = body


            const result = await holeMapper.updatHoleById(body, id);

            if (typeof result === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", result);
            }

            return useResponseSuccess(result);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });


    public static getPlayerCSV = defineEventHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const options = parseParams(params, {
                pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: golfMapper.DEFAULT_SORT, order: golfMapper.DEFAULT_ORDER,
            });

            const teams = await golfMapper.getPlayersCSV(options);

            if (typeof teams === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", teams);
            }

            return golfMapper.prepareListResults(teams, options);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });



    public static apiDeleteTeam = defineEventHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const {teamId} = params

            const teams = await golfMapper.deleteTeam(teamId);

            if (typeof teams === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", teams);
            }
            setResponseStatus(event, 200);
            return useResponseSuccess(event);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

}