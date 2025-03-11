import {mailMapper, golfMapper, teamMapper} from "../mapper/";
import {MailController} from "./mail.controller";
import {inspect} from "util";
import {EmailMessaging} from "../models/EmailMessaging";
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
           console.log("teamsssss")
           console.log(team);


           if (!team.success) {
               return res.status(200).json({ success: team.success, msg: team.message })
           }

           console.log("arrived")
            console.log(team);
           console.log(team.data.captain)
           console.log(optionsPlayer);
           console.log(optionsPlayer.players[0].player)

           if (team.data.captain === optionsPlayer.players[0].player) {
               console.log('it good')
               optionsPlayer.teamId = team.id;
               optionsPlayer.individual = false;
           } else {
               return res.status(500).json({ error_main:"Team name already exists" })
           }
        }

        console.log("about to crate reg")
        const too =  golfMapper.createPlayerRegistration(optionsPlayer);
        console.log("too");
        console.log(too);
        delete(req.body["individual"])


        mailMapper.setupEmail({email_type:EmailMessaging.EMAIL_TYPE_REGISTER, data: req.body})
       // await mailMapper.apiSendMail();



//        await golfMapper.createTeamRegistration(optionsPlayer);
   //     await golfMapper.createPlayerRegistration(optionsPlayer);

        //   await MailController.apiPostSendMail(req, res, next)

        return res.status(200).json({ success: true, msg: "Registration successful" })
    }

    /**
     * Calling all galleries
     * @param req
     * @param res
     * @param next
     */
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

            const galleries = await golfMapper.getAllPlayers(options);

            if (typeof galleries === 'string') {
                return res.status(500).json({ errors_string: galleries })
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

    static async apiPostSendMail(req: any, res: any, next: any) {

        let params = {
            "contact" :  [
                mailMapper.PARAMS_MESSAGE, mailMapper.PARAMS_EMAIL_TYPE, mailMapper.PARAMS_NAME, mailMapper.PARAMS_EMAIL
            ],
            "contact_us" :  [
                mailMapper.PARAMS_MESSAGE, mailMapper.PARAMS_EMAIL_TYPE, mailMapper.PARAMS_NAME, mailMapper.PARAMS_SUBJECT, mailMapper.PARAMS_EMAILORPHONE
            ],
            "sponsor" :  [
                mailMapper.PARAMS_EMAIL_TYPE, mailMapper.PARAMS_EMAIL
            ],
            "volunteer" :  [
                mailMapper.PARAMS_EMAIL_TYPE, mailMapper.PARAMS_NAME, mailMapper.PARAMS_EMAILORPHONE
            ],
            "register" :  [
                mailMapper.PARAMS_EMAIL_TYPE
            ],
        }

        const missingParam = [];
        let valid = true;
        try {

            const paramCheck:string[] = params[req.body[mailMapper.PARAMS_EMAIL_TYPE]]

            Object.values(paramCheck).map(param   => {
                console.log(param);
                if (!req.body[param]) {
                    valid = false;
                    missingParam.push(param);
                }
            });

            if (valid) {
                await mailMapper.prepareEmail(req.body);
                const retVal = await mailMapper.apiSendMail();

                if (retVal['$metadata']['httpStatusCode'] === 200) {

                    return res.status(200).json({
                        success: true,
                        message: `successfully got through with info ${inspect(retVal)}`
                    });
                } else {

                    return res.status(500).json({
                        success: true,
                        message: `Email has not been sent ${inspect(retVal)}`
                    });
                }
            } else {
                return res.status(500).json({
                    success: false,
                    message: `Email has not been sent. Missing parameters: ${inspect(missingParam)}`
                });
            }
        } catch (error) {

            return res.status(500).json({result: "error", message: `Failed the try ${util.inspect(error)}`});
        }

    }
}
