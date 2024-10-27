"use strict";
import {BaseMapper, paramsOptions} from "./base.mapper";

import {Gallery, GalleryTag, Tag, User} from "../models";
//import { User} from "../models";
import {or} from "../db";
import dotenv from 'dotenv';
import * as uuid from 'uuid';
import moment from "moment";
import { get } from "lodash";
export class UserMapper extends BaseMapper {
    private _PARAMS_ID: string = 'id';
    private _PARAMS_EMAIL: string = 'email';
    private _PARAMS_PASSWORD: string = 'password';
    private _PARAMS_USERNAME: string = 'userName';
    private _PARAMS_USER: string = 'user';
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
            User.initialize(this.SEQUELIZE);
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
    
            const userUpdateResult = await User.update(userUpdate, {where: {id: id}}).then(data => {
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

    public async apiSignUp(params) {
        try {
            const userDefaults = {
                id: uuid.v4(),
                userName: params.userName,
                email: params.email,
                password: params.password,
                createdAt: moment().format('YYYY-MM-DD'),
                updatedAt: moment().format('YYYY-MM-DD')
            }

          //  console.log('the params');
          //  console.log(params);
            console.log(userDefaults);
            return await User.findOrCreate({ where: { userName: params.userName },  defaults: userDefaults })
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
            return await User.findOrCreate(userParams).then(data => {
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

    public async getAllUsers(params:  paramsOptions) : Promise <string[] | string> {
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

            return await User.findAll(params).then(users => {
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

export const userMapper = new UserMapper();
