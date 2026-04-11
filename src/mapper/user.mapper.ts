"use strict";
import {BaseMapper, paramsOptions} from "./base.mapper";
import {user} from "../models/User"
import dotenv from 'dotenv';
import * as uuid from 'uuid';
import moment from "moment";
import { get } from "lodash";
import {UserAccess2} from "../models/UserAccess2";
import  crypto from "crypto";
import {Access2} from "../models/Access2";
import {User2} from "../models/User2";
const algorithm = 'aes-256-cbc'; //Using AES encryption
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);
import {sql, gt, lt, eq, SQL, like, and, or} from "drizzle-orm";
import {access} from "../models/Access";
import {userAuthentication} from "../models/UserAuthentication";
import {userAccess} from "../models/UserAccess";
import { Request } from 'express';
import {player} from "../models/Player";
import {H3Event} from "h3";


export class UserMapper extends BaseMapper {
    private _PARAMS_ID: string = 'id';
    private _PARAMS_EMAIL: string = 'email';
    private _PARAMS_PASSWORD: string = 'password';
    private _PARAMS_USERNAME: string = 'username';
    private _PARAMS_USER: string = 'user';
    private _LIST_NAME: string = 'users';
    private _DEFAULT_SORT: string = 'firstName';



    constructor() {
        super();
        this.initializeDrizzle();
    }

    public async apiUpdateUser(params, body) {
        try {
            //const userUpdate = params['user'];
            const id = params['id'];

           // const teams = userUpdate['teams'];
    
            const userUpdateResult = await User2.update(body, {where: {id: id}}).then(data => {
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
            return await User2.findOrCreate({ where: { userName: params.username },  defaults: userDefaults })
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

    async updateUserToken(users, token) {
        try {
            console.log("hee")
            const userSQL = this.DRIZZLE.update(user).set({
                token: token
            }).where(eq(user.id, users.id));
            console.log("the update")
            console.log(userSQL.toSQL())
            await this.getSQLData(userSQL.toSQL())

            return await true;

        } catch(error) {
            console.log(error.toString())
            return error.toString;
        }
    }

    async getAuthToken (event:  H3Event) {

        const authHeader = event.headers.get('authorization');

        if (!authHeader) return null;

        if (!authHeader.startsWith('Bearer ')) return null;

        return authHeader.substring(7); // remove "Bearer "
    }


    /**
     *
     * @param token
     */
    async getUserByToken(token) {
        try {
            // get config vars
            dotenv.config();
            console.log("here2")
            const userSQL = this.DRIZZLE.select({
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                realName: sql<string>`concat(${user.firstName}, ' ', ${user.lastName})`.as ('realName'),
                email: user.email,
                //   username: user.email,
                roles: sql<string>`(SELECT JSON_ARRAYAGG(access.id)
                                     from ${access}
                                    inner join user_access on access.id = user_access.AccessId
                                    where user_access.UserId = user.id)`.as('roles'),
            //    homePath: "/user"
            }).from(user).where(eq(user.token, token));
            console.log("arrivied ader here")
         //   userSQL.where(eq(user.token, token));
            //     console.log(userSQL.toSQL())
            ///console.log(params.userName);
            ///    userSQL.where(or(eq(user.userName, params.userName), eq(user.id, params.userName)));
            console.log(userSQL.toSQL())
            console.log("right before")
            //  or(eq(user.userName, params.userName)), eq(user.id), params.userName)));

            console.log("the results")
            console.log(await this.getSQLData(userSQL.toSQL()));
            return await this.getSQLData(userSQL.toSQL())
        } catch (error) {
            return error.toString();
        }
    }


    /**
     *
     * @param params
     */
    async getUserBasedOnPassword(params)  {
        try {
            // get config vars
            dotenv.config();
            console.log("here")
            const userSQL = this.DRIZZLE.select({
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                roles: sql<string>`(SELECT JSON_ARRAYAGG(access.id)
                                    from ${access}
                                             inner join user_access on access.id = user_access.AccessId
                                    where user_access.UserId = user.id)`.as('roles')
            }).from(user)

            userSQL.where(and(eq(user.password, params.password), or(eq(user.email, params.username), eq(user.id, params.userName)))).limit(1);
            //     console.log(userSQL.toSQL())
            ///console.log(params.userName);
            ///    userSQL.where(or(eq(user.userName, params.userName), eq(user.id, params.userName)));
            console.log(userSQL.toSQL())

            //  or(eq(user.userName, params.userName)), eq(user.id), params.userName)));

            return this.getSQLData(userSQL.toSQL())
        } catch (error) {
            return error.toString();
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

            const userSQL = this.DRIZZLE.select({
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    access: sql<string>`(SELECT JSON_ARRAYAGG(JSON_OBJECT('id', access.id,'name', access.name, 'name', access.name))
                                     from ${access}
                                    inner join user_access on access.id = user_access.AccessId
                                    where user_access.UserId = user.id)`.as('access')
                }).from(user).where(eq(user.id, options.id))


            return (await this.getSQLData(userSQL.toSQL()))[0]
/*
            const userParams = {
                include: [
                    {
                        Model: Access2,
                        association: User2.Access,
                        required: false,
                        as: 'access'
                    },
                ],
                where: {id: options.id},
                attributes: {exclude: ['ImageId', 'GalleryTagTagId']},
            }

            return await User2.findOrCreate(userParams).then(data => {
              //  return this.processArray(data, User)
                console.log('data')
                console.log(data);
                return data[0];
            }).catch(err => {

                return err;
            }) */
        } catch (error) {
            return error.toString();
        }
    }
    /**
     *
     * @param email
     * @returns User2
     */
    public async getUserByEmail(email:string) {
        try {

            const userSQL = this.DRIZZLE.select(user).from(user).where(eq(user.email, email))

            return (await this.getSQLData(userSQL.toSQL()))[0];
        } catch (error) {
            return error.toString();
        }
    }

    public async getAllUsers(params:  paramsOptions) : Promise <string[] | string> {
       const check = params;

        try {
            const offset = ((check.pageIndex - 1) * check.pageSize);
            const userSQL = this.DRIZZLE.select({
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                total: sql<string>`(SELECT count('id') from ${user})`.as('total')
            }).from(user)


            if (check.filterQuery) {
                userSQL.where(or(like(user.firstName, `%${check.filterQuery}%`)), like(user.lastName, `%${check.filterQuery}%`))
            }
            userSQL.offset(offset);
            userSQL.limit(check.pageSize)

            return this.getSQLData(userSQL.toSQL());
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
