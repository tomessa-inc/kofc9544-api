import nJwt from 'njwt';
import dotenv from "dotenv";
import * as uuid from 'uuid';
import { s3Mapper } from './s3.mapper';
//import {SequelizeApi} from "../db/Sequelize";
import process from "process";
import {Promise, Schema} from "mongoose";
import {DrizzleAPI} from "../db/Drizzle";
import * as console from "node:console";
import {size} from "lodash-es";
import axios from "axios";

//import {Sequelize} from "sequelize";


dotenv.config();

export interface PaginationResults {
    list:any,
    pagination: any;
}

export interface bodyOptions {
    

}

export interface paramsOptions {
    id?: string
    pageIndex?:number
    email?:string
    pageSize?:number
    firstName?:string
    filterQuery?:string
    search?:string
    logged?:boolean
    sort?: string,
    order?: string
    listLength?:number,
    email_type?:string,
    token?: string
}

/*
The Base Mapper. Functions which are in common with others mappers are placed here to avoid duplication of code
 */
export class BaseMapper {
    private _QUERY;
    private _DEFAULT_ORDER: string = 'ASC';
    private _DATABASE_NAME: string = 'kofc_golf';
    private _PARAM_FRONTCLOUD = 'https://images.kofc9544.ca'
    private _SEQUELIZE;
    private _DRIZZLE;

    /**
     * Initalizing the Sequelize instance with the configuration data taken from file
     * @param dbConfig
     */
    public async initializeDrizzle() {
        /*        let options = JSON.parse(`{
                                                    "host": "${process.env.DB_HOST}",
                                                    "dialect": "mysql",
                                                    "port":3306,
                                                    "dialectOptions": {
                                                        "options": {
                                                            "requestTimeout": 20000
                                                        }
                                                    },
                                                }`); */
        let options = {
            host: process.env.DB_HOST,
            dialect: "mysql",
            port:3306,
            dialectOptions: {
                connectTimeout:320000
            },
            pool: {
                /*
                 * Lambda functions process one request at a time but your code may issue multiple queries
                 * concurrently. Be wary that `sequelize` has methods that issue 2 queries concurrently
                 * (e.g. `Model.findAndCountAll()`). Using a value higher than 1 allows concurrent queries to
                 * be executed in parallel rather than serialized. Careful with executing too many queries in
                 * parallel per Lambda function execution since that can bring down your database with an
                 * excessive number of connections.
                 *
                 * Ideally you want to choose a `max` number where this holds true:
                 * max * EXPECTED_MAX_CONCURRENT_LAMBDA_INVOCATIONS < MAX_ALLOWED_DATABASE_CONNECTIONS * 0.8
                 */
                max: 2,
                /*
                 * Set this value to 0 so connection pool eviction logic eventually cleans up all connections
                 * in the event of a Lambda function timeout.
                 */
                min: 0,
                /*
                 * Set this value to 0 so connections are eligible for cleanup immediately after they're
                 * returned to the pool.
                 */
                idle: 0,
                // Choose a small enough value that fails fast if a connection takes too long to be established.
                acquire: 3000,
                /*
                 * Ensures the connection pool attempts to be cleaned up automatically on the next Lambda
                 * function invocation, if the previous invocation timed out.
                 */
                evict: 15,
            },
            //  logging: console.log,
        }

        const drizzleAPI = new DrizzleAPI(this._DATABASE_NAME,process.env.DB_USERNAME,process.env.DB_PASSWORD,process.env.DB_HOST);//.initialize();
        this._DRIZZLE = await drizzleAPI.initialize()
    }

    public async processArray(listing) {
     //   console.log('listing')
       // console.log(listing)
        if (listing.length) {
            const listArray = [];

            for (let item of listing) {
                if (!item)
                    continue;
                listArray.push(item.get());
            }
//            console.log('the list array')
  //          console.log(listing)
            return listArray;
        }
        return [];
    }

    public async processImageArray(listing) {
        if (listing.length) {
            const listArray = [];
                
            for (let item of listing) {
                const key = s3Mapper.resizeWithInS3(item.key, {
                    "resize": {
                        "width": 400,
                        "height": 400,
                        "fit": "inside"
                    }
                });


                item.key = `${this._PARAM_FRONTCLOUD}/${key}`;
               
                listArray.push(item);
            }

            return listArray;
        }

        return [];
    }

    public async getSQLData(preparedSQL, processKeyImage:boolean = false) {
        const ff = JSON.stringify(preparedSQL)
        const sqlquery = ff.replace(/"/g, '\\\"').replace(/\\n/g, "")

        const text = JSON.parse(`{"sql": "${sqlquery}"}`)
        const text2 = `{"sql": "${sqlquery}"}`
        console.log(text);
        console.log(text2);
        const url = 'https://api-stage.db.tomessa.ca/kofc_golf';
//        const url = 'http://localhost:8000/kofc_golf';



        return await axios.post(url,
            text
        )
            .then( async (response) => {
                if (processKeyImage) {

                    return await this.processImageArray(response.data.data[0])
                }
             //   console.log("no image")

               // console.log(response.data.data[0])
                return response.data.data[0]
            })
            .catch( (error)=>  {
                console.log(error);
            });
    }


    /**
     * Preparing the paginated results
     * @param list
     * @param body
     */
    public prepareListResults(list, body: paramsOptions) {
        return this.generatePagination(list, body)
    }

    /**
     * Generation of pagination for various retrieval of lists
     * @param list: string[]
     * @param query: Query
     */
    public generatePagination(list:string[], body: paramsOptions) : PaginationResults {
        let listClone;
        listClone = list;

        const search = body.search || null;
        const sort = body.sort || this['DEFAULT_SORT']
        const order = body.order || 'asc';
        const page = body.pageIndex || 1;
        const size = body.pageSize || 10;

        if (sort === 'identifier' || sort === body.sort)
        {
            listClone.sort((a, b) => {
                const fieldA = a[sort].toString().toUpperCase();
                const fieldB = b[sort].toString().toUpperCase();

                return order === 'asc' ? fieldA.localeCompare(fieldB) : fieldB.localeCompare(fieldA);
            });
        }  else {
            listClone.sort((a, b) => order === 'asc' ? a[sort] - b[sort] : b[sort] - a[sort]);
        }

        // If search exists...
        if ( search )
        {
            // Filter the products
            listClone = listClone.filter(contact => contact.name && contact.name.toLowerCase().includes(search.toLowerCase()));
        }
        // Paginate - Start
        const listLength = body.listLength

        // Calculate pagination details
        const begin = (page -1 ) * size;
        const end = Math.min((size * (page + 1)), listLength);
        const lastPage = Math.max(Math.ceil(listLength / size), 1);

        // Prepare the pagination object
        let pagination = {};

        // If the requested page number is bigger than
        // the last possible page number, return null for
        // products but also send the last possible page so
        // the app can navigate to there

        if ( page > lastPage )
        {
            listClone = null;
            pagination = {
                lastPage
            };
        } else {
            // Paginate the results by size
         //   list = listClone.slice(begin, end);
           // console.log('the final list');
            //console.log(list);
            // Prepare the pagination mock-api
            pagination = {
                total    : listLength,
                pageSize      : size,
                pageIndex      : page,
                lastPage  : lastPage,
                startIndex: begin,
                endIndex  : end - 1
            };
        }

        return JSON.parse(`{"data":${JSON.stringify(list)}, "total":"${listLength}","pageSize":"${size}", "pageIndex":"${page}", "lastage":"${lastPage}"}`);
    }

    public generateJWTToken() {
        const token = nJwt.create({
            iss: "https://kofc9544.ca/",  // The URL of your service
            sub: uuid.v4(),    // The UID of the user in your system
            scope: "self"
        },process.env.TOKEN_SECRET);

        token.setExpiration(new Date().getTime() + 60*1000)

        return token.compact();
    }

    public checkAuthenication(tokenHeader = undefined) {
        if (!tokenHeader) {
            return undefined
        }

        try {
            const token = tokenHeader.replace(/^Bearer\s/, '');

            const verified = nJwt.verify(token, process.env.TOKEN_SECRET);

            return (verified.body['exp'] < Date.now());
        } catch (error) {
            return error.toString();
        }
    }

    public generateId(data:string) {
        return data.replace(/\s+/g, '-').toLowerCase();
    }

    /**
     * Sleep
     * @param ms
     */
    async sleep(ms)
    {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    get DEFAULT_ORDER(): string {
        return this._DEFAULT_ORDER;
    }

    set QUERY(value: string) {
        this._QUERY = value;
    }

    set DATABASE_NAME(value: string) {
        this._DATABASE_NAME = value;
    }

    get SEQUELIZE() {
        return this._SEQUELIZE;
    }

    get DRIZZLE() {
        return this._DRIZZLE;
    }
}

