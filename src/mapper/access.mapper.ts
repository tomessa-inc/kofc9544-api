"use strict";
import {BaseMapper, paramsOptions} from "./base.mapper";

import {Gallery, GalleryTag, Tag, Access} from "../models";
//import { User} from "../models";
import {or} from "../db";
import dotenv from 'dotenv';
import * as uuid from 'uuid';
import moment from "moment";
import { get } from "lodash";
export class AccessMapper extends BaseMapper {
    private _PARAMS_ID: string = 'id';
    private _PARAMS_EMAIL: string = 'email';
    private _PARAMS_NAME: string = 'name';
    private _PARAMS_DESCRIPTION: string = 'description';
    private _LIST_NAME: string = 'users';
    private _DEFAULT_SORT: string = 'username';


    constructor() {
        super();
        this.DATABASE_NAME = 'kofc_golf';
        this.initalizeSequelize()
        this.initializeUsers();
    }

    private async initializeUsers() {
        try {
            // const tag = await Tag.initialize(this.SEQUELIZE);
            // const galleryTag = GalleryTag.initialize(this.SEQUELIZE, tag);
            Access.initialize(this.SEQUELIZE);
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

            const userUpdateResult = await Access.update(userUpdate, {where: {id: id}}).then(data => {
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
            return await Access.findOrCreate({ where: { name: params.name },  defaults: accessDefaults })
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
            return await Access.findOrCreate(userParams).then(data => {
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
            console.log(check);
            const offset = ((check.pageIndex - 1) * check.pageSize);



            const galleryConfig = {
                include: [
                    {
                        Model: Tag,
                        association: Gallery.Tag,
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

            return await Access.findAll(params).then(users => {
                return this.processArray(users);
            }).catch(error => {
                return error.toString();
            });

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
