"use strict";
import {BaseMapper, paramsOptions} from "./base.mapper";

//import { User} from "../models";
import {or} from "../db";
import dotenv from 'dotenv';
import * as uuid from 'uuid';
import moment from "moment";
import { get } from "lodash";
import {UserAccess2} from "../models/UserAccess2";
import {use} from "chai";
import {Access2} from "../models/Access2";
import {Tag2} from "../models/Tag2";
import {Gallery2} from "../models/Gallery2";
import {access} from "../models/Access";
export class AccessMapper extends BaseMapper {
    private _PARAMS_ID: string = 'id';
    private _PARAMS_EMAIL: string = 'email';
    private _PARAMS_NAME: string = 'name';
    private _PARAMS_DESCRIPTION: string = 'description';
    private _LIST_NAME: string = 'users';
    private _DEFAULT_SORT: string = 'username';


    constructor() {
        super();
     //   this.initializeSequelize()
     //   this.initializeUsers();
        this.initializeDrizzle()
    }

    private async initializeUsers() {
        try {
            // const tag = await Tag.initialize(this.SEQUELIZE);
            // const galleryTag = GalleryTag.initialize(this.SEQUELIZE, tag);
            Access2.initialize(this.SEQUELIZE);
//            Gallery.initialize(this.SEQUELIZE, tag, galleryTag);
        } catch (error) {
            console.log(error);

        }
    }


    public async apiUpdateUser(params) {
        try {
            const userUpdate = params['user'];
            const id = params['id'];

            const teams = userUpdate['teams'];

            const userUpdateResult = await Access2.update(userUpdate, {where: {id: id}}).then(data => {
                return true;
            }).catch(data => {
                return false;
            });

            return userUpdateResult;

        } catch (error) {
            console.log('catch');
            console.log(error);
            return error;
        }
    }

    public async apiCreateAccess(params) {
        try {
            const accessDefaults = {
                id: params.id,
                name: params.name,
                description: params.description,
                createdAt: moment().format('YYYY-MM-DD'),
                updatedAt: moment().format('YYYY-MM-DD')
            }

            //  console.log('the params');
            //  console.log(params);
            console.log(accessDefaults);
            return await Access2.findOrCreate({ where: { name: params.name },  defaults: accessDefaults })
                //const result = await User.findOrCreate(user, defaults: userDefaults
                .then(data => {

                    return data;

                }).catch(data => {

                    return data;
                });
        } catch (error) {
            return error.toString;
        }
    }


    public async apiDeleteAccess(id) {
        try {
            return await UserAccess2.destroy({ where: { UserId: id }})
                //const result = await User.findOrCreate(user, defaults: userDefaults

        } catch (error) {
            return error.toString;
        }
    }

    public async apiAddAccess(userId, access) {
        try {
            const userParams = {
                where: {
                    UserId: userId,
                    AccessId: access,
                    createdAt: moment().format('YYYY-MM-DD'),
                    updatedAt: moment().format('YYYY-MM-DD')
                },
            }

            console.log(userParams)
            return await UserAccess2.findOrCreate(userParams)
        } catch (error) {
            return error.toString;
        }
    }

    /**
     *
     * @param params
     */
    async getUserBasedOnPassword(params) {
        try {
            // get config vars
            dotenv.config();
            const userParams = {
                raw: true,
                where: {
                    password: params.password,
                    userName: params.userName
                },
            };

            console.log(userParams);
            return await Access2.findOrCreate(userParams).then(data => {
                console.log('in find')
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

    public async getAllAccess(params:  paramsOptions) { //: Promise <string[] | string> {
        const check = params;

        try {

            const offset = ((check.pageIndex - 1) * check.pageSize) ?? 0



            const galleryConfig = {
                include: [
                    {
                        Model: Tag2,
                        association: Gallery2.Tag,
                        required: false
                    },
                ],
                attributes: {exclude: ['ImageId', 'GalleryTagTagId']},
                offset: offset,
                limit: check.pageSize,
            }

            const params = {
                offset: offset,
                limit: check.pageSize,
            };

            const accessSQL = this.DRIZZLE.select().from(access).limit(check.pageSize).offset(offset)

            return this.getSQLData(accessSQL.toSQL())
          /*  return await Access2.findAll(params).then(users => {
                return this.processArray(users);
            }).catch(error => {
                return error.toString();
            }); */

        } catch (error) {
            return error.toString() //["error" => error.toString()];
        }
    }

    get PARAMS_ID(): string {
        return this._PARAMS_ID;
    }

    get PARAMS_EMAIL(): string {
        return this._PARAMS_EMAIL;
    }

    get PARAMS_NAME(): string {
        return this._PARAMS_NAME;
    }

    get PARAMS_DESCRIPTION(): string {
        return this._PARAMS_DESCRIPTION;
    }

    get LIST_NAME(): string {
        return this._LIST_NAME;
    }

    get DEFAULT_SORT(): string {
        return this._DEFAULT_SORT;
    }
}

export const accessMapper = new AccessMapper();
