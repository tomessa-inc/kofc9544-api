"use strict";
import {BaseMapper, paramsOptions} from "./base.mapper";


//import { User} from "../models";
import {Op} from "sequelize"
import {or} from "../db";
import dotenv from 'dotenv';
import * as uuid from 'uuid';
import moment from "moment";
import { get } from "lodash";
import {UserAccess} from "../models/UserAccess";
import  crypto from "crypto";
import {Access} from "../models/Access";
import {User} from "../models/User";
const algorithm = 'aes-256-cbc'; //Using AES encryption
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);


export class UserMapper extends BaseMapper {
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
        this.initializeUsers();
    }

    private async initializeUsers() {
        try {
            const model = {access: null, userAccess: null}

        //    console.log('the sequelize')
          //  console.log(this.SEQUELIZE)
            model.access  = await Access.initialize(this.SEQUELIZE);

          ///  this.MODEL({access: access})
            model.userAccess = await UserAccess.initialize(this.SEQUELIZE, model);
         //   model.authentication = await UserAuthentication.initialize(this.SEQUELIZE, model);

            User.initialize(this.SEQUELIZE, model);
//            Gallery.initialize(this.SEQUELIZE, tag, galleryTag);
        } catch (error) {
            console.log(error);

        }
    }


    public async apiUpdateUser(params, body) {
        try {
            //const userUpdate = params['user'];
            const id = params['id'];

           // const teams = userUpdate['teams'];
    
            const userUpdateResult = await User.update(body, {where: {id: id}}).then(data => {
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

    /**
     *
     * @param options
     * @returns
     */
    public async getUserById(options: paramsOptions) {
        try {
            console.log('get user');

            const userParams = {
                include: [
                    {
                        Model: Access,
                        association: User.Access,
                        required: false,
                        as: 'access'
                    },
                ],
                where: {id: options.id},
                attributes: {exclude: ['ImageId', 'GalleryTagTagId']},
            }

            return await User.findOrCreate(userParams).then(data => {
              //  return this.processArray(data, User)
                console.log('data')
                console.log(data);
                return data[0];
            }).catch(err => {

                return err;
            })
        } catch (error) {
            return error.toString();
        }
    }

    public async getAllUsers(params:  paramsOptions) : Promise <string[] | string> {
       const check = params;

        try {
            console.log(check);
            const offset = ((check.pageIndex - 1) * check.pageSize);


            const params = {
                offset: offset,
                limit: check.pageSize,
                where: null,
            };

            if (check.filterQuery) {
                params.where =  {
                    [Op.or]: [
                        {
                            firstName:
                                {
                                    [Op.like]: `%${check.filterQuery}%`
                                }
                        },
                        {
                            lastName:
                                {
                                    [Op.like]: `%${check.filterQuery}%`
                                }
                        },
                    ]
                }
            }

            return await User.findAll(params).then(users => {
                return this.processArray(users);
            }).catch(error => {
                return error.toString();
            });

        } catch (error) {
            return error.toString() //["error" => error.toString()];
        }
    }



    //Encrypting text
    encrypt(text) {
        let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
        console.log("the cypher is ");
        console.log(cipher);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        console.log(encrypted.toString('hex'))
        return encrypted.toString('hex')
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
