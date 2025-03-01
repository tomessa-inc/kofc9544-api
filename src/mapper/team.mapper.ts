import { BaseMapper } from ".";
import moment from "moment";
import * as uuid from 'uuid';
import {Player} from "../models/Player";
import {GalleryTag} from "../models/GalleryTag";
import {OptionsPlayer} from "../controllers/golf.controller";
import {Team} from "../models/Team";
import {Op} from "sequelize";


export class TeamMapper extends BaseMapper {
    private _PARAMS_NAME: string = 'name';
    private _DEFAULT_SORT: string = 'name';


    constructor() {
        super();
        this.DATABASE_NAME = 'kofc_golf';
        this.initializeSequelize()
        this.initializeTeam();
    }


    private async initializeTeam() {
        Team.initialize(this.SEQUELIZE);
    }

    public async createTeamRegistration(params: OptionsPlayer) {
        try {


            var teamName = params.team_name

            if (teamName === "") {
                teamName = params.players[0].player
            }

            console.log("the team name")
            console.log(teamName)
            const team = {
                id: teamName.replace(/\s+/g, '-').toLowerCase(),
                name: teamName,
                captain: params.players[0].player,
                createdAt: moment().format('YYYY-MM-DD'),
                updatedAt: moment().format('YYYY-MM-DD'),
            };


            const id = await Team.create(team);

            return {success: true, data: id.toJSON()}
        } catch (error) {
            return {success: false, message: `Team name "${teamName}" already exists`};
        }
    }

    public async getAllTeamsNeedingPlayers(params) {
        /*
        try {
            const team = {
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
                }
            }
            return await Team.findAll(team).then(data => {
                return data;
            }).catch(err => {
                return err;
            })
        } catch (error) {
            console.log(`Could not fetch gallery ${error}`)
        } */
    }


    public async getAllTeams(params) {
        try {
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
            return await Team.findAll(team).then(data => {
                return data;
            }).catch(err => {
                return err;
            })
        } catch (error) {
            console.log(`Could not fetch gallery ${error}`)
        }
    }


    public async getPlayersByTeamId(params) {
        try {
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
            return await Team.findAll(team).then(data => {
                return data;
            }).catch(err => {
                return err;
            })
        } catch (error) {
            console.log(`Could not fetch gallery ${error}`)
        }
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

                return await Player.findOrCreate({ where: { name: player.player, email: player.email }, defaults: playerObject });

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