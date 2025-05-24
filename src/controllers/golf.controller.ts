import {mailMapper, golfMapper, teamMapper} from "../mapper/";
import {MailController} from "./mail.controller";
import {inspect} from "util";
import {EmailMessaging} from "../models/EmailMessaging";
import moment from "moment/moment";
//import {golfMapper} from "../mapper/golf.mapper";
//import {teamMapper} from "../mapper/team.mapper";

const util = require('util');

export interface OptionsPlayer {
    team_name?: string,
    players:
        {
            "player": string,
            "email": string,
            "phone": string,
            allergies?: string,
        }[],
    body?: string,
    teamId?: string,
    individual?:boolean,
    "email_type": string
}

export class GolfController {

    static async apiRegisterTournament(req: any, res: any, next: any) {
        let team;
        const optionsPlayer: OptionsPlayer  = req.body
        optionsPlayer.individual = true;

        if (optionsPlayer.players.length >= 2) {
           team =  await teamMapper.createTeamRegistration(optionsPlayer);

           console.log("first team")
            console.log(team);
           if (!team.success) {
               return res.status(200).json({ success: team.success, msg: team.message })
           }

           console.log("team results")
            console.log(team);
           if (team.data.affectedRows === 1) {
                console.log("good")
               optionsPlayer.teamId = team.data.id;
               optionsPlayer.individual = false;
           } else {
               console.log("bad")
               return res.status(500).json({ error_main:"Team name already exists" })
           }
        }
        console.log("next")
        await golfMapper.createPlayerRegistration(optionsPlayer);

        await mailMapper.setupEmail({email_type:EmailMessaging.EMAIL_TYPE_REGISTER, data: req.body})
        console.log("right before end")
        console.log(moment().format('yyyy-mm-dd:hh:mm:ss'))
        return res.status(200).json({ success: true, msg: "Registration successful" })
    }

    /**
     * Calling all galleries
     * @param req
     * @param res
     * @param next
     *//*
    public static async apiGetAllPlayersWithoutTeams(req: any, res: any, next: any) {
        try {
            //        if (!galleryMapper.checkAuthenication(req.headers.authorization)) {
            //        return res.status(500).json({error: 'Not Authorized to access the API'})
            //      }

            const options = { pageIndex: 1, pageSize: 10, filterQuery: "", sort: golfMapper.DEFAULT_SORT, order: golfMapper.DEFAULT_ORDER };

            Object.entries(req.params).map(([key, value]) => {
                if (value !== 'undefined') {
                    if (isNaN(Number(value))) {
                        options[key] = value;
                    } else {
                        options[key] = Number(value);
                    }
                }
            })

                 const galleries = await golfMapper.getAllPlayersWithoutTeams(options);

            if (typeof galleries === 'string') {
                return res.status(500).json({ errors_string: galleries })
            }
            const paginationResults = golfMapper.prepareListResults(galleries, options);

            return res.status(200).json(paginationResults);

        } catch (error) {
            res.status(500).json({ error_main: error.toString() })
        }

    } */


    /**
     * Calling all galleries
     * @param req
     * @param res
     * @param next
     */
    public static async getAllTeamsNeedingPlayersLabelValue(req: any, res: any, next: any) {
        try {
            //        if (!galleryMapper.checkAuthenication(req.headers.authorization)) {
            //        return res.status(500).json({error: 'Not Authorized to access the API'})
            //      }

            const options = { pageIndex: 1, pageSize: 10, filterQuery: "", sort: golfMapper.LABEL_SORT, order: golfMapper.DEFAULT_ORDER };

            Object.entries(req.params).map(([key, value]) => {
                if (value !== 'undefined') {
                    if (isNaN(Number(value))) {
                        options[key] = value;
                    } else {
                        options[key] = Number(value);
                    }
                }
            })
            const teams = await teamMapper.getAllTeamsNeedingPlayersLabelValue(options);

            console.log("gallkery")
            console.log(teams)
            console.log(options);
            if (typeof teams === 'string') {
                return res.status(500).json({ errors_string: teams })
            }

            return res.status(200).json(teams);

        } catch (error) {
            res.status(500).json({ error_main: error.toString() })
        }

    }

    /**
     * Calling all galleries
     * @param req
     * @param res
     * @param next
     */
    public static async getAllPlayersNeedingTeamsLabelValue(req: any, res: any, next: any) {
        try {
            //        if (!galleryMapper.checkAuthenication(req.headers.authorization)) {
            //        return res.status(500).json({error: 'Not Authorized to access the API'})
            //      }

            const options = { pageIndex: 1, pageSize: 10, filterQuery: "", sort: golfMapper.LABEL_SORT, order: golfMapper.DEFAULT_ORDER };

            Object.entries(req.params).map(([key, value]) => {
                if (value !== 'undefined') {
                    if (isNaN(Number(value))) {
                        options[key] = value;
                    } else {
                        options[key] = Number(value);
                    }
                }
            })
            const teams = await golfMapper.getAllPlayersNeedingTeamsLabelValue(options);

            console.log("gallkery")
            console.log(teams)
            console.log(options);
            if (typeof teams === 'string') {
                return res.status(500).json({ errors_string: teams })
            }

            return res.status(200).json(teams);

        } catch (error) {
            res.status(500).json({ error_main: error.toString() })
        }

    }



    /**
     * Calling all galleries
     * @param req
     * @param res
     * @param next
     */
    public static async apiGetTeamsMissingPlayers(req: any, res: any, next: any) {
        try {
            //        if (!galleryMapper.checkAuthenication(req.headers.authorization)) {
            //        return res.status(500).json({error: 'Not Authorized to access the API'})
            //      }

            const options = { pageIndex: 1, pageSize: 10, filterQuery: "", sort: golfMapper.LABEL_SORT, order: golfMapper.DEFAULT_ORDER };

            Object.entries(req.params).map(([key, value]) => {
                if (value !== 'undefined') {
                    if (isNaN(Number(value))) {
                        options[key] = value;
                    } else {
                        options[key] = Number(value);
                    }
                }
            })
            const galleries = await teamMapper.getAllTeamsNeedingPlayers(options);

            console.log("gallkery")
            console.log(galleries)
            console.log(options);
            if (typeof galleries === 'string') {
                return res.status(500).json({ errors_string: galleries })
            }
            const paginationResults = golfMapper.prepareListResults(galleries, options);
            console.log("gogo")

            return res.status(200).json(paginationResults);

        } catch (error) {
            res.status(500).json({ error_main: error.toString() })
        }

    }




    /**
     * Calling all galleries
     * @param req
     * @param res
     * @param next
     */
    public static async apiGetAllPlayers(req: any, res: any, next: any) {
        try {
            //        if (!galleryMapper.checkAuthenication(req.headers.authorization)) {
            //        return res.status(500).json({error: 'Not Authorized to access the API'})
            //      }

            const options = { pageIndex: 1, pageSize: 10, filterQuery: "", sort: golfMapper.DEFAULT_SORT, order: golfMapper.DEFAULT_ORDER };

            Object.entries(req.params).map(([key, value]) => {
                if (value !== 'undefined') {
                    if (isNaN(Number(value))) {
                        options[key] = value;
                    } else {
                        options[key] = Number(value);
                    }
                }
            })

            const galleries = await golfMapper.getAllPlayers(options);

            if (typeof galleries === 'string') {
                // return res.status(500).json({ errors_string: galleries })
            }
            const paginationResults = golfMapper.prepareListResults(galleries, options);

            return res.status(200).json(paginationResults);

        } catch (error) {
            res.status(500).json({ error_main: error.toString() })
        }

    }

    /**
     * Calling all galleries
     * @param req
     * @param res
     * @param next
     */
    public static async apiGetAllTeams(req: any, res: any, next: any) {
        try {
            //        if (!galleryMapper.checkAuthenication(req.headers.authorization)) {
            //        return res.status(500).json({error: 'Not Authorized to access the API'})
            //      }

            const options = { pageIndex: 1, pageSize: 10, filterQuery: "", sort: golfMapper.DEFAULT_SORT, order: golfMapper.DEFAULT_ORDER };

            Object.entries(req.params).map(([key, value]) => {
                if (value !== 'undefined') {
                    if (isNaN(Number(value))) {
                        options[key] = value;
                    } else {
                        options[key] = Number(value);
                    }
                }
            })

            const team = await teamMapper.getAllTeams(options);

            if (typeof team === 'string') {
                return res.status(500).json({ errors_string: team })
            }

            const paginationResults = teamMapper.prepareListResults(team, options);

            console.log("page")
            console.log(paginationResults)
            return res.status(200).json(paginationResults);

        } catch (error) {
            res.status(500).json({ error_main: error.toString() })
        }

    }


    /**
     * Calling all galleries
     * @param req
     * @param res
     * @param next
     */
    public static async apiUpdatePlayedById(req: any, res: any, next: any) {
        try {
            //        if (!galleryMapper.checkAuthenication(req.headers.authorization)) {
            //        return res.status(500).json({error: 'Not Authorized to access the API'})
            //      }

            console.log(req.body)
            console.log(req.params.id)
            const team = await golfMapper.updatePlayerById(req.body, req.params.id);
        console.log("rep")
            console.log(team);

            if (typeof team === 'string') {
                return res.status(500).json({ errors_string: team })
            }

            return res.status(200).json(team);

        } catch (error) {
            res.status(500).json({ error_main: error.toString() })
        }

    }

    /**
     * Calling all galleries
     * @param req
     * @param res
     * @param next
     */
    public static async apiGetPlayersByTeamId(req: any, res: any, next: any) {
        try {
            //        if (!galleryMapper.checkAuthenication(req.headers.authorization)) {
            //        return res.status(500).json({error: 'Not Authorized to access the API'})
            //      }

            const options = { id: null, pageIndex: 1, pageSize: 10, filterQuery: "", sort: golfMapper.DEFAULT_SORT, order: golfMapper.DEFAULT_ORDER };

            Object.entries(req.params).map(([key, value]) => {
                if (value !== 'undefined') {
                    if (isNaN(Number(value))) {
                        options[key] = value;
                    } else {
                        options[key] = Number(value);
                    }
                }
            })

            console.log("options")
            console.log(options);

            const team = await golfMapper.getPlayersByTeamId(options);

            if (typeof team === 'string') {
                return res.status(500).json({ errors_string: team })
            }

            const paginationResults = teamMapper.prepareListResults(team, options);

            return res.status(200).json(paginationResults);

        } catch (error) {
            res.status(500).json({ error_main: error.toString() })
        }

    }


}
