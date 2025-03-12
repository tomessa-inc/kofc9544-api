import  {Sequelize, Dialect} from '.';
import dotenv from "dotenv";
import mysql from 'mysql2/promise';
dotenv.config();
import { drizzle } from 'drizzle-orm/mysql2';

export interface OptionsSequelize {
    host:string;
    dialect: Dialect;
    port:number;
    dialectOptions: {
        options: {
            requestTimeout: number
        }
    },1
}
/*
export interface DBOptions {
    DB_NAME: string
    DB_USERNAME: string
    DB_PASSWORD: string
    DB_HOST: string
    NODE_ENV: string
} *?

/**
 * SequelizeApi class. A class that deals with working with Sequelize
 */
export class DrizzleAPI {
    private _database: string;
    private _username: string;
    private _password: string;
    private _host:string;

    /**
     * Constructor for class
     * @param database
     * @param username
     * @param password
     * @param options
     */
    constructor(database: string, username: string, password: string, host:string) {
        this._database = database;
        this._username = username;
        this._password = password;
        this._host = host;
        console.log(this)
    }

    /**
     * Initialization function for sequelize
     */
    public initialize() {

        const pool = mysql.createPool({
            host: this._host,
            port: 3306,
            user: this._username,
            password: this._password,
            database: this._database,

        });
        return drizzle(pool)
//        return new Sequelize(this._database, this._username, this._password, this._options);
    };
}
/*
let options;

if (process.env.NODE_ENV === 'dev') {
    options = {host: process.env.DB_HOST, dialect: 'mysql', port:3306}
//    options = {host: '127.0.0.1', dialect: 'mysql', port:3306}
} else if ( process.env.NODE_ENV === 'stage') {
    options = {host: process.env.DB_HOST, dialect: 'mysql', port:3306}
} else {
    options = {host: process.env.DB_HOST, dialect: 'mysql', port:3306}
}

let sequelizeClass = new SequelizeApi(process.env.DB_NAME, process.env.DB_USERNAME,process.env.DB_PASSWORD, options );//.initialize();
let sequelize = sequelizeClass.initialize();

export {sequelize};
*/