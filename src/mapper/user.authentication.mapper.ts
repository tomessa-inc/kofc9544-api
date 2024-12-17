"use strict";
import {BaseMapper, paramsOptions} from "./base.mapper";

//import {Access, Gallery, GalleryTag, Tag, User, UserAuthentication} from "../models";

//import { User} from "../models";
import {Op} from "sequelize"
import {or} from "../db";
import dotenv from 'dotenv';
import * as uuid from 'uuid';
import moment from "moment";
import { get } from "lodash";
import {UserAccess} from "../models/UserAccess";
import  crypto from "crypto";
//import {Access, User, UserAuthentication} from "../models";
import {Access} from "../models/Access";
import {User} from "../models/User";
import {UserAuthentication} from "../models/UserAuthentication";


const algorithm = 'aes-256-cbc'; //Using AES encryption
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);


export class UserAuthenticationMapper extends BaseMapper {
    private _PARAMS_ID: string = 'id';
    private _PARAMS_EMAIL: string = 'email';
    private _PARAMS_PASSWORD: string = 'password';
    private _PARAMS_USERNAME: string = 'userName';
    private _PARAMS_USER: string = 'user';
    private _LIST_NAME: string = 'users';
    private _DEFAULT_SORT: string = 'firstName';



    constructor() {
        super();
        this.DATABASE_NAME = 'kofc_golf';
        this.initializeSequelize()
        this.initializeUserAuthentication();
    }

    private async initializeUserAuthentication() {
        try {
            const model = {access: null, userAccess: null,  user: null}

            //    console.log('the sequelize')
            //  console.log(this.SEQUELIZE)
            model.access  = await Access.initialize(this.SEQUELIZE);

            ///  this.MODEL({access: access})
            model.userAccess = await UserAccess.initialize(this.SEQUELIZE, model);

            model.user = await User.initialize(this.SEQUELIZE, model);

            UserAuthentication.initialize(this.SEQUELIZE, model);
//            Gallery.initialize(this.SEQUELIZE, tag, galleryTag);
        } catch (error) {
            console.log(error);

        }
    }


    /**
     *
     * @param params
     */
    async getUserBasedOnToken(params) {
        try {
            const userParams = {
                include: [
                    {
                        Model: User,
                        association: UserAuthentication.User,
                        required: true,
                        include: [
                            {
                                Model: Access,
                                association: User.Access,
                                required: false,
                                as: 'Access'
                            },
                        ],
                    },
                ],
                where: {token: params.token},
                attributes: {exclude: ['ImageId', 'GalleryTagTagId']},
            }

            console.log(userParams);
            return await UserAuthentication.findAll(userParams).then(data => {
                console.log(data)
                return data[0];
//                data[0].accessToken = this.generateJWTToken();
            }).catch(data => {
                return data;
            });
        } catch (error) {
            console.log(`Could not fetch users ${error}`)
        }
    }



    /**
     *
     * @param id
     */
    async deleteTokenEntry(id:string) {
        try {
            const userParams = {
                where: {UserId: id},
            }
            // get config vars
            //    dotenv.config();


            /*   const userParams = {
                   where: {
                       UserId: userId,
                       AccessId: access,
                       createdAt: moment().format('YYYY-MM-DD'),
                       updatedAt: moment().format('YYYY-MM-DD')
                   },
               } */

            //     return await UserAuthentication.create(userParams);

            return await UserAuthentication.destroy(userParams);
        } catch (error) {
            console.log(`Could not create token ${error}`)
            console.log(error);
        }
    }


    /**
     *
     * @param params
     */
    async createTokenEntry(id,token) {
        try {
            // get config vars
            //    dotenv.config();
            const userParams = {
                id: `${id}-${token}`,
                UserId: id,
                token: token,
                eventType: "PASSWORD_RESET",
                createdAt: moment().format('YYYY-MM-DD'),
                updatedAt: moment().format('YYYY-MM-DD')
            };

            /*   const userParams = {
                   where: {
                       UserId: userId,
                       AccessId: access,
                       createdAt: moment().format('YYYY-MM-DD'),
                       updatedAt: moment().format('YYYY-MM-DD')
                   },
               } */

            //     return await UserAuthentication.create(userParams);

            return await UserAuthentication.create(userParams);
        } catch (error) {
            console.log(`Could not create token ${error}`)
            console.log(error);
        }
    }


    get PARAMS_ID(): string {
        return this._PARAMS_ID;
    }

    get PARAMS_EMAIL(): string {
        return this._PARAMS_EMAIL;
    }

    get PARAMS_PASSWORD(): string {
        return this._PARAMS_PASSWORD;
    }

    get PARAMS_USERNAME(): string {
        return this._PARAMS_USERNAME;
    }

    get PARAMS_USER(): string {
        return this._PARAMS_USER;
    }

    get LIST_NAME(): string {
        return this._LIST_NAME;
    }

    get DEFAULT_SORT(): string {
        return this._DEFAULT_SORT;
    }
}

export const userAuthenticationMapper = new UserAuthenticationMapper();
