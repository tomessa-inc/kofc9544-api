import {BaseMapper, mailMapper, paramsOptions} from ".";
import moment from "moment";
import * as uuid from 'uuid';
import {player} from  "../models/Player"
import {GalleryTag2} from "../models/GalleryTag2";
import {OptionsPlayer} from "../controllers/golf.controller";
import {Tag2} from "../models/Tag2";
import {Gallery2} from "../models/Gallery2";
import {Team2} from "../models/Team2";
import {Image2} from "../models/Image2";
import {EmailMessaging} from "../models/EmailMessaging";
import {team} from "../models/Team";
import {hole} from "../models/Hole"
import {eq, and, sql, count, lt, isNotNull, asc,desc} from 'drizzle-orm';
import {test} from "mocha";
import {gallery} from "../models/Gallery";
import {calendar} from "../models/Calendar";


export interface HoleObject {
//                    createdAt: moment().format('YYYY-MM-DD'),
    //                  updatedAt: moment().format('YYYY-MM-DD'),
}[]


export class HoleMapper extends BaseMapper {
    private _PARAMS_NAME: string = 'name';
    private _DEFAULT_SORT: string = 'name';
    private _LABEL_SORT: string = 'label';
    private _LABEL_VALUE: string = 'value';
    declare protected _OBJECT_RETRIEVED: HoleObject



    constructor() {
        super();
//        this.initializeSequelize()
        this.initializeDrizzle()
        //       this.initializePlayer();
    }



    private async initializePlayer() {

        // const team = Team.initialize(this.SEQUELIZE);

        //   Player2.initialize(this.SEQUELIZE, team);
    }



    public async createHole(params) {
        let retval;
//        console.log("the registration")
        console.log(params)
        try {



                const holeObject   = {
                    id: params.id,
                    name: params.name,
                    par: params.par


//                    createdAt: moment().format('YYYY-MM-DD'),
                    //                  updatedAt: moment().format('YYYY-MM-DD'),
                };
                //            console.log("playe")
                //          console.log(playerObject);
                /*
                console.log("before player")
                console.log(moment().format('yyyy-mm-dd:hh:mm:ss'))
                console.log("playerObject")
                console.log(playerObject)
                console.log("Player")
*/

                const holeSQL = this.DRIZZLE.insert(hole).values(holeObject).$returningId();


                console.log(holeSQL.toSQL())
                const retval = await this.getSQLData(holeSQL.toSQL())
                console.log('the reval')

            /*
            const test = params.players.map( async (player) => {

                const playerObject = {
                    name: player.player,
                    email: player.email,
                    phone: player.phone,
                    individual: params.individual,
                    TeamId: params.teamId ?? null,
                    allergies: player.allergies,
                    createdAt: moment().format('YYYY-MM-DD'),
                    updatedAt: moment().format('YYYY-MM-DD'),
                };
                console.log("playe")
                console.log(playerObject);
                const test2 = await Player2.create(playerObject);
                console.log("test2")
                console.log(test2.toJSON())
                await mailMapper.setupEmail({email_type:EmailMessaging.EMAIL_TYPE_SEND_ID, data: test2.toJSON()})
             ///   await mailMapper.apiSendMail()
                return test2.toJSON()

            }) */

            //   console.log("the testing stuff")
            // console.log(test);
            //  test.email_type = EmailMessaging.EMAIL_TYPE_SEND_ID


        } catch (error) {
            return error
        } finally {
            // close any opened connections during the invocation
            // this will wait for any in-progress queries to finish before closing the connections
            //    await this.SEQUELIZE.connectionManager.close();
        }

    }


    /**
     *
     * @param playerObject
     * @param id
     * @returns
     */
    public async updatHoleById(holeObject, id) {
        try {


            const playerSQL = this.DRIZZLE.update(hole).set({
                name: holeObject.name,
                par: holeObject.par,
            }).where(eq(hole.id, id))
            console.log("eoot")
            console.log(playerSQL.toSQL())

            return await this.getSQLData(playerSQL.toSQL())
            /*
                        const offset = ((options.pageIndex - 1) * options.pageSize)
                        const players = {
                            include: [
                                {
                                    Model: Team2,
                                    association: Player2.Team,
                                    required: false
                                },
                            ],
                            where: [{ TeamId: options.id }],
                            offset: offset,
                            limit: options.pageSize,

                        }

                        console.log("players")
                        console.log(players)

                        return await Player2.findAll(players).then(data => {
                            console.log("the players")
                            console.log(data);
                            return this.processArray(data);
                        }).catch(err => {
                            return err;
                        }) */
        } catch (error) {
            return error.toString()
        }
    }

    /**
     *
     * @param options
     * @returns
     */
    public async getPlayersByTeamId(options: paramsOptions) {
        try {
            console.log("sql")
            const playerSQL = this.DRIZZLE.select({
                id: player.id,
                name: player.name,
                email: player.email,
                phone: player.phone,
                TeamId: player.TeamId,
                total: sql<string>`(SELECT count('id') from ${player} where ${player.TeamId} = 'portage')`.as('total')
            }).from(player).innerJoin(team, eq(player.TeamId, team.id)).where(eq(team.id, options.id))

            return await this.getSQLData(playerSQL.toSQL())
            /*
                        const offset = ((options.pageIndex - 1) * options.pageSize)
                        const players = {
                            include: [
                                {
                                    Model: Team2,
                                    association: Player2.Team,
                                    required: false
                                },
                            ],
                            where: [{ TeamId: options.id }],
                            offset: offset,
                            limit: options.pageSize,

                        }

                        console.log("players")
                        console.log(players)

                        return await Player2.findAll(players).then(data => {
                            console.log("the players")
                            console.log(data);
                            return this.processArray(data);
                        }).catch(err => {
                            return err;
                        }) */
        } catch (error) {
            console.log(`Could not fetch galleries ${error}`)
        }
    }

    public async getAllHolesNeedingTeamsLabelValue(params) {

        try {
            //  this.DRIZZLE.select().count().from(team).where(eq(team.id, ${team.id}));

            let holeNeedingTeamsSQL = this.DRIZZLE.select({
                value: sql<string>`${hole.id}`.as("value"),
                label: sql<string>`${hole.name}`.as("label"),
                countTeams: sql<number> `count(${team.id})`.as("countTeams"),
                total: sql<string>`(SELECT count('id') from hole)`.as('total')
            }).from(hole)
                .leftJoin(team, eq(hole.id, team.hole))
                .groupBy(hole.id, hole.name)
                .having(lt(sql<number>`count(${team.id})`, 2));
            ;

//            holeNeedingTeamsSQL = holeNeedingTeamsSQL.innerJoin(team, eq(hole.id, team.hole)).having(lt(holeNeedingTeamsSQL.config.fields.countTeams, 2)).groupBy(hole.id, hole.name)




            //    teamsNeedingPlayersSQL = teamsNeedingPlayersSQL.where(lt(teamsNeedingPlayersSQL.config.fields.countPlayers.fieldAlias, 3));
            console.log(holeNeedingTeamsSQL.toSQL())
            /* SELECT count(*)

                                         FROM ${player}
                                         left join team on player.teamId = team.id)`, 3)); */
            //return true;
            return this.getSQLData(holeNeedingTeamsSQL.toSQL());
        } catch (error) {
            return error.toString()
        }
    }

    /*     const team = {
             attributes: {
                 include: [
                     [
                         this.SEQUELIZE.literal(`(
                     SELECT count(\`player\`.\`id\`) FROM player LEFT JOIN team ON player.teamId = team.id)`),
                         'count',
                     ]
                 ],
                 where: {
                 //    'count' > 3,
                 },
             firstName:
                 {
                     [Op.like]: `%${check.filterQuery}%`
                 }
             } 8/
         }
         return await Team.findAll(team).then(data => {
             return data;
         }).catch(err => {
             return err;
         })
     } catch (error) {
         console.log(`Could not fetch gallery ${error}`)
     }
 }
*/


    public async getAllHoles(params: paramsOptions)  { //: Promise<string[] | string> {
        try {
            console.log(params);

            const offset = ((params.pageIndex - 1) * params.pageSize) ?? 1

            console.log("offset")
            console.log(offset);
            const playerSQL = this.DRIZZLE.select({
                id:  hole.id,
                name: hole.name,
                par: hole.par,
                total: sql<string>`(SELECT count('id') from hole)`.as('total')
            }).from(hole).offset(offset).limit(params.pageSize)
            console.log(params.order);

            if (params.order == "asc")  {
                console.log("doijng asc")
                playerSQL.orderBy(asc(hole.name))
            } else {
                console.log("doijng desc")
                playerSQL.orderBy(desc(hole.name))
            }

            return this.getSQLData(playerSQL.toSQL());
        } catch (error) {

            return error.toString();
        }
    }

    /*
        public async getAllTeamsMissingPlayers(params: paramsOptions) { //: Promise<string[] | string> {
            try {
    /*            console.log(params);

                const offset = ((params.pageIndex - 1) * params.pageSize) ?? 1

                console.log("offset")

                console.log(offset);
                const golfConfig = {
                    include: [
                        {
                            Model: Tag2,
                            association: Gallery2.Tag,
                            required: false
                        },
                    ],
                    attributes: {exclude: ['ImageId', 'GalleryTagTagId']},
                    offset: offset,
                    limit: params.pageSize,
                }
                return await Player.findAll(golfConfig).then(galleries => {
                    return this.processArray(galleries);
                }).catch(err => {
                    console.log('the error');
                    console.log(err);
                    return err;
                })
            } catch (error) {

                return error.toString();
            }
        }
    */
    public async getAllPlayersNeedingTeamsLabelValue(params) {

        try {
            //  this.DRIZZLE.select().count().from(team).where(eq(team.id, ${team.id}));

            console.log("before")
            let teamsNeedingPlayersSQL = this.DRIZZLE.select({
                value: sql<string>`${team.id}`.as("value"),
                label: sql<string>`${team.name}`.as("label"),
                /*
                                sql<bigint>`(SELECT count(player.id)
                                                    from ${player}
                                                    inner join team as subteam on player.teamId = subteam.id
                                                    where subteam.id = value
                                                    GROUP BY subteam.id

                                                    )`.as('countPlayers') */
            }).from(player).where(isNotNull(player.TeamId));
            // const test = teamsNeedingPlayersSQL.config.fields.countPlayers.fieldAlias;
            //  console.log(test);
            //  console.log("test")
            //  console.log( teamsNeedingPlayersSQL.config.fields)
            //  teamsNeedingPlayersSQL = teamsNeedingPlayersSQL.innerJoin(player, eq(team.id, player.TeamId)).having(lt(teamsNeedingPlayersSQL.config.fields.countPlayers, 4)).groupBy(team.id, team.name)




            //    teamsNeedingPlayersSQL = teamsNeedingPlayersSQL.where(lt(teamsNeedingPlayersSQL.config.fields.countPlayers.fieldAlias, 3));
            console.log(teamsNeedingPlayersSQL.toSQL())
            /* SELECT count(*)

                                         FROM ${player}
                                         left join team on player.teamId = team.id)`, 3)); */
            //return true;
            return this.getSQLData(teamsNeedingPlayersSQL.toSQL());
        } catch (error) {
            return error.toString()
        }
    }
    /*
        public async getAllPlayersWithoutTeams(params: paramsOptions) { //: Promise<string[] | string> {
            try {
                console.log(params);

                const offset = ((params.pageIndex - 1) * params.pageSize) ?? 1

                console.log("offset")

                console.log(offset);
                const golfConfig = {
                    include: [
                        {
                            Model: Tag2,
                            association: Gallery2.Tag,
                            required: false
                        },
                    ],
                    attributes: {exclude: ['ImageId', 'GalleryTagTagId']},
                    offset: offset,
                    limit: params.pageSize,
                }
                return await Player.findAll(golfConfig).then(galleries => {
                    return this.processArray(galleries);
                }).catch(err => {
                    console.log('the error');
                    console.log(err);
                    return err;
                })
            } catch (error) {

                return error.toString();
            }
        }
    */

    /**
     *
     * @param options
     * @returns
     *//*
    public async getAllTagsForGallery(options) {
        try {


            const gallery = {
                include: [{
                    model: GalleryTag,
                    association: GalleryTag.Tag,
                    required: true
                }],
                where: {
                    '$gallery_tag.gallery_id$': options.gallery_id
                },
                //  'gallery_tag.gallery': '975f63c6-8a0f-4536-a126-ffdde09c217c'
                //  group: ['gallery_tag.tag_id']

            }
            //            console.log('the gallery');
            //          console.log(gallery);

            return await Tag.findAll(gallery).then(data => {
                return data[0];
            }).catch(err => {
                return err;
            })
        } catch (error) {
            console.log(`Could not fetch gallery ${error}`)
        }
    }

    public async getAllTags(params) { //: Promise<string[] | string> {
        let offset;

        try {

            const offset = ((params.pageIndex - 1) * params.pageSize)

            const tagConfig = {
                offset: offset,
                limit: params.pageSize,

            }

            return await Tag.findAll(tagConfig).then(images => {
                return this.processArray(images);
            }).catch(err => {
                return err;
            })
        } catch (error) {
            console.log(error);
            return error.toString();
        }
    }
*/
    get DEFAULT_SORT(): string {
        return this._DEFAULT_SORT;
    }

    get PARAMS_NAME(): string {
        return this._PARAMS_NAME;
    }


    get LABEL_SORT(): string {
        return this._LABEL_SORT;
    }


    get LABEL_VALUE(): string {
        return this._LABEL_VALUE;
    }
}

export const holeMapper = new HoleMapper();