"use strict";
import {BaseMapper, paramsOptions} from "./base.mapper";
import {access} from "../models/Access";
import {userAuthentication} from "../models/UserAuthentication"
import {user} from "../models/User"

//import {Access, Gallery, GalleryTag, Tag, User, UserAuthentication} from "../models";

//import { User} from "../models";
import {Op} from "sequelize"
import {or} from "../db";
import dotenv from 'dotenv';
import * as uuid from 'uuid';
import moment from "moment";
import { get } from "lodash";
import {UserAccess2} from "../models/UserAccess2";
import  crypto from "crypto";
//import {Access, User, UserAuthentication} from "../models";
import {Access2} from "../models/Access2";
import {User2} from "../models/User2";
import {sql, gt, lt, eq, SQL} from "drizzle-orm";
import {player} from "../models/Player";


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
        this.initializeDrizzle()
   //     this.initializeSequelize()
     //   this.initializeUserAuthentication();
    }


    /**
     *
     * @param params
     */
    async getUserBasedOnToken(params) {
        try {
            const tokenSQL = this.DRIZZLE.select({
                id:user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                access: sql<string>`(SELECT *
                                    from ${access}
                                    inner join ${userAuthentication} on ${userAuthentication.UserId} = user.id)`.as('access')

                }


            ).from(userAuthentication).innerJoin(user, eq(user.id, userAuthentication.UserId)).where(eq(userAuthentication.token, params.token));

            return this.getSQLData(tokenSQL.toSQL())

/*
            const userParams = {
                include: [
                    {
                        Model: User2,
                        association: UserAuthentication2.User,
                        required: true,
                        include: [
                            {
                                Model: Access2,
                                association: User2.Access,
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
            return await UserAuthentication2.findAll(userParams).then(data => {
                console.log(data)
                return data[0];
//                data[0].accessToken = this.generateJWTToken();
            }).catch(data => {
                return data;
            }); */
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
            const deleteSQL = this.DRIZZLE.destroy(userAuthentication).where(eq(userAuthentication.UserId, id));

            return this.getSQLData(deleteSQL.toSQL())
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
            const tokenSQL = this.DRIZZLE.insert(userAuthentication).values({
                id: `${id}-${token}`,
                UserId: id,
                token: token,
                eventType: "PASSWORD_RESET",
            })
            return this.getSQLData(tokenSQL.toSQL())
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
