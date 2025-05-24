import {BaseMapper, paramsOptions} from ".";
import moment from "moment";
import * as uuid from 'uuid';
import {player} from "../models/Player";
import {GalleryTag2} from "../models/GalleryTag2";
import {OptionsPlayer} from "../controllers/golf.controller";


import {team} from "../models/Team";
import {image} from "../models/Image";
import {gallery} from "../models/Gallery";
import {sql, gt, lt, eq, SQL, count} from "drizzle-orm";
import {galleryTag} from "../models/GalleryTag";
import {MySqlSelectBase} from "drizzle-orm/mysql-core/query-builders/select";



export class TeamMapper extends BaseMapper {
    private _PARAMS_NAME: string = 'name';
    private _DEFAULT_SORT: string = 'name';


    constructor() {
        super();
        this.DATABASE_NAME = 'kofc_golf';
        this.initializeDrizzle()
    }



    public async createTeamRegistration(params: OptionsPlayer) {
        try {


            var teamName = params.team_name

            if (teamName === "") {
                teamName = params.players[0].player
            }

            const teamObject = {
                id: teamName.replace(/\s+/g, '-').toLowerCase(),
                name: teamName,
                captain: params.players[0].player,
            };
            console.log("before")
            console.log(teamObject)
            console.log(moment().format('yyyy-mm-dd:hh:mm:ss'))
            const retval =  await this.DRIZZLE.insert(team).values(teamObject);
            console.log("the team")
            console.log(retval);

           // const retval = await this.getSQLData(sqlPrepared.toSQL())

            console.log(moment().format('yyyy-mm-dd:hh:mm:ss'))

            return {success: true, data: {id: teamName.replace(/\s+/g, '-').toLowerCase(), affectedRows: retval[0].affectedRows}}
        } catch (error) {
            console.log(error);
            return {success: false, message: `Team name "${teamName}" already exists`};
        }
    }

    public async getAllTeamsNeedingPlayersLabelValue(params) {

        try {
          //  this.DRIZZLE.select().count().from(team).where(eq(team.id, ${team.id}));

            console.log("before")
            let teamsNeedingPlayersSQL = this.DRIZZLE.select({
                value: sql<string>`${team.id}`.as("value"),
                label: sql<string>`${team.name}`.as("label"),
                countPlayers: sql<number> `count(${player.id})`.as("countPlayer"),
/*
                sql<bigint>`(SELECT count(player.id)
                                    from ${player}
                                    inner join team as subteam on player.teamId = subteam.id
                                    where subteam.id = value
                                    GROUP BY subteam.id
                                    
                                    )`.as('countPlayers') */
            }).from(team);
           // const test = teamsNeedingPlayersSQL.config.fields.countPlayers.fieldAlias;
          //  console.log(test);
          //  console.log("test")
          //  console.log( teamsNeedingPlayersSQL.config.fields)
            teamsNeedingPlayersSQL = teamsNeedingPlayersSQL.innerJoin(player, eq(team.id, player.TeamId)).having(lt(teamsNeedingPlayersSQL.config.fields.countPlayers, 4)).groupBy(team.id, team.name)




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


    public async getAllTeamsNeedingPlayers(params) {

        try {
            //  this.DRIZZLE.select().count().from(team).where(eq(team.id, ${team.id}));

            console.log("before")
            let teamsNeedingPlayersSQL = this.DRIZZLE.select({
                id: team.id,
                name: team.name,
                countPlayers: sql<number> `count(${player.id})`.as("countPlayers"),
                /*
                                sql<bigint>`(SELECT count(player.id)
                                                    from ${player}
                                                    inner join team as subteam on player.teamId = subteam.id
                                                    where subteam.id = value
                                                    GROUP BY subteam.id

                                                    )`.as('countPlayers') */
            }).from(team);
            // const test = teamsNeedingPlayersSQL.config.fields.countPlayers.fieldAlias;
            //  console.log(test);
            //  console.log("test")
            //  console.log( teamsNeedingPlayersSQL.config.fields)
            teamsNeedingPlayersSQL = teamsNeedingPlayersSQL.innerJoin(player, eq(team.id, player.TeamId)).having(lt(teamsNeedingPlayersSQL.config.fields.countPlayers, 4)).groupBy(team.id, team.name)




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

    public async getAllTeams(params: paramsOptions) {
        try {
            const offset = ((params.pageIndex - 1) * params.pageSize) ?? 1

            const teamsSQL = this.DRIZZLE.select({
                id: team.id,
                name: team.name,
                countPlayers: sql<string>`(SELECT count(player.id)
                                    from player
                                    inner join team as subteam on player.TeamId = subteam.id
                                    where player.TeamId = team.id
                                    GROUP BY subteam.id
                                         )`.as('countPlayers')


            }).from(team).offset(offset).limit(params.pageSize)

            return this.getSQLData(teamsSQL.toSQL());
/*            const team = {
                attributes: {
                    include: [
                        [
                            this.SEQUELIZE.literal(`(
                        SELECT count(\`player\`.\`id\`) FROM player LEFT JOIN team ON player.teamId = team.id)`),
                            'count',
                        ]
                    ]
                }
            }
            return await Team2.findAll(team).then(data => {
                return data;
            }).catch(err => {
                return err;
            }) */
        } catch (error) {
            return error.toString()
        }
    }


    public async getPlayersByTeamId(params) {
      /*  try {
            const team = {
                attributes: {
                    include: [
                        [
                            this.SEQUELIZE.literal(`(
                        SELECT count(\`player\`.\`id\`) FROM player LEFT JOIN team ON player.teamId = team.id)`),
                            'count',
                        ]
                    ]
                }
            }
            return await Team2.findAll(team).then(data => {
                return data;
            }).catch(err => {
                return err;
            })
        } catch (error) {
            console.log(`Could not fetch gallery ${error}`)
        }  */
    }




    /*

        public async createPlayerRegistration(params: OptionsPlayer) {
            console.log("the registration")
            console.log(params)

            const test = params.players.map((player) => {
                const playerObject = {
                    id: player.player.replace(/\s+/g, '-').toLowerCase(),
                    name: player.player,
                    email: player.email,
                    phone: player.phone,
                    createdAt: moment().format('YYYY-MM-DD'),
                    updatedAt: moment().format('YYYY-MM-DD'),
                };

                return await Player2.findOrCreate({ where: { name: player.player, email: player.email }, defaults: playerObject });

            })


            const player = {
                id: params.players.replace(/\s+/g, '-').toLowerCase(),
                name: params.name,
                email: params.email,
                phone: params.phone,
                createdAt: moment().format('YYYY-MM-DD'),
                updatedAt: moment().format('YYYY-MM-DD'),
            };
        }
        if (params.players.length === 1) {
        const player = {
            id: params.id,
            name: params.name,
            email: params.email,
            phone: params.phone,
            createdAt: moment().format('YYYY-MM-DD'),
            updatedAt: moment().format('YYYY-MM-DD'),
        };
    }
    if (params.players.length === 1) {
        const player = {
            id: params.id,
            name: params.name,
            email: params.email,
            phone: params.phone,
            createdAt: moment().format('YYYY-MM-DD'),
            updatedAt: moment().format('YYYY-MM-DD'),
        };
        ``````
    } else {

    }
    }

    public async createTag(params) { //: Promise<string[] | string> {

        try {
            const tag = {
                id: params.id,
                name: params.name,
                description: params.description,
                createdAt: moment().format('YYYY-MM-DD'),
                updatedAt: moment().format('YYYY-MM-DD'),
            };

            return await Tag.findOrCreate({ where: { name: params.name }, defaults: tag });
        } catch (error) {
            console.log(error);
            return error.toString();
        }
    }

    /**
     *
     * @param options
     * @returns
     */ /*
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
    } */

    get DEFAULT_SORT(): string {
        return this._DEFAULT_SORT;
    }

    get PARAMS_NAME(): string {
        return this._PARAMS_NAME;
    }
}

export const teamMapper = new TeamMapper();