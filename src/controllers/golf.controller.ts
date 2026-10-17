import { defineHandler, readBody, getRouterParams } from "h3";
import {mailMapper, golfMapper, teamMapper, holeMapper} from "../mapper/";
import { EmailMessaging } from "../models/EmailMessaging";
import { useResponseError, useResponseSuccess } from "../utils/response";
import moment from "moment";
import {player} from "../models/Player";
import {team} from "../models/Team";

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

export interface Registration {
    PAR: string;
    'TEAM NAME': string;
    'HOLE': string;
    'LAST NAME': string;
    'FIRST NAME': string;
    EMAIL: string;
    REGISTERED: string;
    PAID: 'Y' | 'N';
    PHONE: string;
    NOTES: string;
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

    public static apiRegisterTournament = defineHandler(async (event) => {
        try {
            const body = await readBody<OptionsPlayer>(event);
            const optionsPlayer: OptionsPlayer = { ...body, individual: true };

            if (optionsPlayer.players.length >= 2) {
                const team = await teamMapper.createTeamRegistration(optionsPlayer);

                if (!team.success) {
                    event.res.status = 409;
                    return useResponseError("Conflict", team.message );
                  //  return useResponseError("BadRequestException", team.message);
                }

                if (team.data.affectedRows === 1) {
                    optionsPlayer.TeamId = team.data.id;
                    optionsPlayer.individual = false;
                } else {
                    event.res.status = 500;
                    return useResponseError("InternalServerError", "Team name already exists");
                }
            }

            await golfMapper.createPlayerRegistration(optionsPlayer);
            await mailMapper.setupEmail({ email_type: EmailMessaging.EMAIL_TYPE_REGISTER, data: body });

            return useResponseSuccess({ message: "Registration successful" });
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static getAllHolesNeedingTeamsLabelValue = defineHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const options = parseParams(params, {
                pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: golfMapper.VALUE_SORT, order: golfMapper.DEFAULT_ORDER,
            });

            const teams = await holeMapper.getAllHolesNeedingTeamsLabelValue(options);

            if (typeof teams === "string") {
                event.res.status = 500;
                return useResponseError("InternalServerError", teams);
            }

            return golfMapper.prepareListResults(teams, options);
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static getAllTeamsNeedingPlayersLabelValue = defineHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const options = parseParams(params, {
                pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: golfMapper.LABEL_SORT, order: golfMapper.DEFAULT_ORDER,
            });

            const teams = await teamMapper.getAllTeamsNeedingPlayersLabelValue(options);

            if (typeof teams === "string") {
                event.res.status = 500;
                return useResponseError("InternalServerError", teams);
            }

            return golfMapper.prepareListResults(teams, options);
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static getAllPlayersNeedingTeamsLabelValue = defineHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const options = parseParams(params, {
                pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: golfMapper.LABEL_SORT, order: golfMapper.DEFAULT_ORDER,
            });

            const teams = await golfMapper.getAllPlayersNeedingTeamsLabelValue(options);

            if (typeof teams === "string") {
                event.res.status = 500;
                return useResponseError("InternalServerError", teams);
            }

            return teams;
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiGetTeamsMissingPlayers = defineHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const options = parseParams(params, {
                pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: golfMapper.DEFAULT_SORT, order: golfMapper.DEFAULT_ORDER,
            });

            const galleries = await teamMapper.getAllTeamsNeedingPlayers(options);

            if (typeof galleries === "string") {
                event.res.status = 500;
                return useResponseError("InternalServerError", galleries);
            }

            return golfMapper.prepareListResults(galleries, options);
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiGetAllHoles = defineHandler(async (event) => {
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
                event.res.status = 500;
                return useResponseError("InternalServerError", holes);
            }
            console.log("sdasdf")
            return golfMapper.prepareListResults(holes, options);
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiGetAllPlayers = defineHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const options = parseParams(params, {
                pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: golfMapper.DEFAULT_SORT, order: golfMapper.DEFAULT_ORDER,
            });

            const players = await golfMapper.getAllPlayers(options);

            if (typeof players === "string") {
                event.res.status = 500;
                return useResponseError("InternalServerError", players);
            }

            return golfMapper.prepareListResults(players, options);
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiGetAllTeams = defineHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const options = parseParams(params, {
                pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: golfMapper.DEFAULT_SORT, order: golfMapper.DEFAULT_ORDER,
            });

            const teams = await teamMapper.getAllTeams(options);

            if (typeof teams === "string") {
                event.res.status = 500;
                return useResponseError("InternalServerError", teams);
            }

            return teamMapper.prepareListResults(teams, options);
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiUpdatePlayedById = defineHandler(async (event) => {
        try {
            const { id } = getRouterParams(event);
            const body = await readBody<Record<string, any>>(event);

            const result = await golfMapper.updatePlayerById(body, id);

            if (typeof result === "string") {
                event.res.status = 500;
                return useResponseError("InternalServerError", result);
            }

            return useResponseSuccess(result);
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });


    public static apiCreatePlayer = defineHandler(async (event) => {
        try {
            const body = await readBody<Record<string, any>>(event);
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
                event.res.status = 500;
                return useResponseError("InternalServerError", result);
            }

            return useResponseSuccess(result);
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });


    public static apiGetPlayersByTeamId = defineHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const options = parseParams(params, {
                id: null, pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: golfMapper.DEFAULT_SORT, order: golfMapper.DEFAULT_ORDER,
            });

            const players = await golfMapper.getPlayersByTeamId(options);

            if (typeof players === "string") {
                event.res.status = 500;
                return useResponseError("InternalServerError", players);
            }

            return teamMapper.prepareListResults(players, options);
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });



    public static apiCreateTeam = defineHandler(async (event) => {
        try {
            const body = await readBody<Record<string, any>>(event);

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
                event.res.status = 500;
                return useResponseError("InternalServerError", result);
            }
*/
            return useResponseSuccess(event);
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });



    public static apiCreateHole = defineHandler(async (event) => {
        try {
            const body = await readBody<Record<string, any>>(event);

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
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiUpdateTeamById = defineHandler(async (event) => {
        try {
            const body = await readBody<Record<string, any>>(event);
            // PUT /team/:id: the URL id is authoritative; the body id is only a fallback for clients
            // that call /team/undefined.
            const routeId = getRouterParams(event).id;
            const id = routeId && routeId !== "undefined" && routeId !== "null" ? routeId : body?.id;
            if (!id) {
                event.res.status = 400;
                return useResponseError("BadRequest", "Missing team id");
            }
            const bodyArray = {
                id: id,
                name: body.name,
                captain: body.captain,
                hole: body.hole,
            }

            const result = await teamMapper.updateTeamById(bodyArray, id);

            if (typeof result === "string") {
                event.res.status = 500;
                return useResponseError("InternalServerError", result);
            }

            return useResponseSuccess(result);
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });


    public static apiUpdateHoleById = defineHandler(async (event) => {
        try {
            const body = await readBody<Record<string, any>>(event);
            const {id} = body


            const result = await holeMapper.updatHoleById(body, id);

            if (typeof result === "string") {
                event.res.status = 500;
                return useResponseError("InternalServerError", result);
            }

            return useResponseSuccess(result);
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });


    public static getPlayerCSV = defineHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const options = parseParams(params, {
                pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: golfMapper.DEFAULT_SORT, order: golfMapper.DEFAULT_ORDER,
            });

            const teams = await golfMapper.getPlayersCSV(options);

            if (typeof teams === "string") {
                event.res.status = 500;
                return useResponseError("InternalServerError", teams);
            }

            return golfMapper.prepareListResults(teams, options);
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });



    public static apiDeleteTeam = defineHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const {teamId} = params

            const teams = await golfMapper.deleteTeam(teamId);

            if (typeof teams === "string") {
                event.res.status = 500;
                return useResponseError("InternalServerError", teams);
            }
            event.res.status = 200;
            return useResponseSuccess(event);
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });


    public static apiDeletePlayer = defineHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const {playerId} = params

            const teams = await golfMapper.deletePlayer(playerId);

            if (typeof teams === "string") {
                event.res.status = 500;
                return useResponseError("InternalServerError", teams);
            }
            event.res.status = 200;
            return useResponseSuccess(event);
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiImportPlayers = defineHandler(async (event) => {
        var holeIdBackup : string =''
        var teamId : string
        try {
            console.log("start of function")
            const formData = await event.req.formData();
            const file = formData.get('file') as File;

            if (!file) {
                event.res.status = 400;
                return useResponseError('BadRequest', 'No file provided');
            }
            console.log("past read file")
            // Read file content
            const text = await file.text();
            const [header, ...rows] = text.split('\n');
            const keys = header.split(',').map(k => k.trim());
            console.log("gfsg")
            console.log(rows);
            const players: Registration[] = rows
                .filter(row => row.trim())
                .map(row => {
                    const values = row.split(',');
                    return keys.reduce((obj, key, i) => {
                        obj[key] = values[i]?.trim();
                        return obj;
                    }, {} as any);
                });

            // Resolve every hole up front so an unknown hole rejects the file before anything is written.
            const holeIds = new Map<string, string>();
            const missingHoles: string[] = [];
            for (let x = 0; x < players.length; x++) {
                if (players[x]["FIRST NAME"] == '') {
                    continue
                }
                const holeName = players[x]["HOLE"]
                if (!holeIds.has(holeName)) {
                    const holeRows = await holeMapper.getHoleIdByHoleName(holeName)
                    if (holeRows?.[0]?.id) {
                        holeIds.set(holeName, holeRows[0].id)
                    }
                }
                if (!holeIds.has(holeName)) {
                    missingHoles.push(`"${holeName ?? ''}" (${players[x]["FIRST NAME"]} ${players[x]["LAST NAME"]})`)
                }
            }

            if (missingHoles.length > 0) {
                event.res.status = 400;
                return useResponseError('BadRequest', `Unknown hole(s), nothing was imported: ${missingHoles.join(', ')}`);
            }

            for (let x = 0; x < players.length; x++) {
                if (players[x]["FIRST NAME"] == '') {
                    console.log("empty")
                    continue
                }
                console.log("arrived")
                console.log(players[x])

                let test:Registration
                const fullName = players[x]["FIRST NAME"] + " " + players[x]["LAST NAME"]
                const holeId = holeIds.get(players[x]["HOLE"])

                if (players[x]["TEAM NAME"] == '') {
                    if (holeIdBackup == "" || holeIdBackup !=  holeId) {
                        holeIdBackup = holeId
                        teamId = fullName.replace(/\s+/g, '-').toLowerCase()
                    }
                  //  const fullName = players[x]["FIRST NAME"] + " " + players[x]["LAST NAME"]
                    console.log("missing")
                        //const teamId = fullName.replace(/\s+/g, '-').toLowerCase()
                    console.log("team id")
                    console.log(teamId)
                    const retval = await teamMapper.doesTeamExist(teamId)
                    console.log("the retval")
                    console.log(retval)
                    if (retval.length == 0) {
                        await teamMapper.insertTeam(teamId, fullName,  players[x]["FIRST NAME"],holeId)
                    }
                } else {
                    console.log("team exists")
                    const retval = await teamMapper.doesTeamExist(players[x]["TEAM NAME"])
                    console.log("the retval")
                    console.log(retval)
                    if (retval.length > 0) {
                        teamId = retval[0].id
                    } else {
                        teamId = players[x]["TEAM NAME"].replace(/\s+/g, '-').toLowerCase()
                        await teamMapper.insertTeam(teamId, players[x]["TEAM NAME"], players[x]["FIRST NAME"], holeId)
                    }
                }

                const playerCheck = await golfMapper.checkIfPlayerExists(fullName, players[x].EMAIL)
              //  console.log(playerCheck)
                if (playerCheck.length == 0) {
                    console.log("the full name")
                    console.log(fullName);
                    await golfMapper.insertPlayer(fullName,players[x].EMAIL, players[x]["FIRST NAME"], players[x]["LAST NAME"], players[x].PHONE, teamId)
                }
             ///   golfMapper.insertPlayer(fullName,players[x].EMAIL, players[x]["FIRST NAME"], players[x]["LAST NAME"] )
    /*
                    const teamObject = {
                        id: teamName.replace(/\s+/g, '-').toLowerCase(),
                        name: teamName,
                        captain: params.players[0].player,
                    };
                    teamMapper.doesTeamExist
                    */
                }
           //     teamMapper.createTeamFromCSV()
             //   console.log("player")
               // console.log(players[0])
//                await golfMapper.createPlayer(player);

/*
            const teamObject = {
                id: teamName.replace(/\s+/g, '-').toLowerCase(),
                name: teamName,
                captain: params.players[0].player,
            }; */

           // teamMapper.insertTeamFromCSV()
          //  console.log("before result")
//            const result = await golfMapper.importPlayers(players);
            //console.log("before response status")
            event.res.status = 200;
            return useResponseSuccess(event);
        } catch (error) {
            event.res.status = 500;
            return useResponseError('InternalServerError', error.toString());
        }
    });

}