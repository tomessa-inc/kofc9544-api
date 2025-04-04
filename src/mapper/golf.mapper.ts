import {BaseMapper, mailMapper, paramsOptions} from ".";
import moment from "moment";
import * as uuid from 'uuid';
import {Player2} from "../models/Player2";
import {player} from  "../models/Player"
import {GalleryTag2} from "../models/GalleryTag2";
import {OptionsPlayer} from "../controllers/golf.controller";
import {Tag2} from "../models/Tag2";
import {Gallery2} from "../models/Gallery2";
import {Team2} from "../models/Team2";
import {Image2} from "../models/Image2";
import {EmailMessaging} from "../models/EmailMessaging";


export interface PlayerObject {
    id?:number,
    name:string,
    email: string,
    phone: string
    individual: boolean
    TeamId: string,
    allergies: string
//                    createdAt: moment().format('YYYY-MM-DD'),
    //                  updatedAt: moment().format('YYYY-MM-DD'),
}

export class GolfMapper extends BaseMapper {
    private _PARAMS_NAME: string = 'name';
    private _DEFAULT_SORT: string = 'name';



    constructor() {
        super();
        this.DATABASE_NAME = 'kofc_golf';
//        this.initializeSequelize()
        this.initializeDrizzle()
 //       this.initializePlayer();
    }



    private async initializePlayer() {

       // const team = Team.initialize(this.SEQUELIZE);

     //   Player2.initialize(this.SEQUELIZE, team);
    }



    public async createPlayerRegistration(params: OptionsPlayer) {
        let retval;
//        console.log("the registration")
  //      console.log(params)
        try {
            for (let x=0; x< params.players.length; x++) {
                const playerObject :PlayerObject  = {
                    name: params.players[x].player,
                    email: params.players[x].email,
                    phone: params.players[x].phone,
                    individual: params.individual,
                    TeamId: params.teamId ?? null,
                    allergies: params.players[x].allergies
//                    createdAt: moment().format('YYYY-MM-DD'),
  //                  updatedAt: moment().format('YYYY-MM-DD'),
                };
    //            console.log("playe")
      //          console.log(playerObject);
                console.log("before player")
                console.log(moment().format('yyyy-mm-dd:hh:mm:ss'))
                console.log("playerObject")
                console.log(playerObject)
                console.log("Player")


                const test2 = this.DRIZZLE.insert(player).values(playerObject)
               retval = await this.getSQLData(test2.toSQL())

                playerObject.id = retval.insertId
                console.log(moment().format('yyyy-mm-dd:hh:mm:ss'))
        //        console.log("test2")
         //       console.log(test2.toJSON())
                const test =  await mailMapper.setupEmail({email_type:EmailMessaging.EMAIL_TYPE_SEND_ID, data: playerObject})
                console.log("test")
                console.log(test)
            }
            console.log("after for loop")
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


            return retval
        } catch (error) {
            console.log("the error here")
            console.log(error);
            return error
        } finally {
            // close any opened connections during the invocation
            // this will wait for any in-progress queries to finish before closing the connections
        //    await this.SEQUELIZE.connectionManager.close();
        }

    }

    /**
     *
     * @param options
     * @returns
     */
    public async getPlayersByTeamId(options: paramsOptions) {
        try {

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
            })
        } catch (error) {
            console.log(`Could not fetch galleries ${error}`)
        }
    }


    public async getAllPlayers(params: paramsOptions) { //: Promise<string[] | string> {
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
            return await Player2.findAll(golfConfig).then(galleries => {
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
            return await Player2.findAll(golfConfig).then(galleries => {
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

}

export const golfMapper = new GolfMapper();