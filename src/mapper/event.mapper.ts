"use strict";
//import {gallery as Gallery, image as Image} from "../models/";
import {BaseMapper, paramsOptions} from '.';
import moment from "moment";
import {hasSubscribers} from "diagnostics_channel";
import * as uuid from 'uuid';
import {Image} from "../models/";
import {SequelizeApi} from "../db/Sequelize";

export class EventMapper extends BaseMapper {
    private _PARAMS_ID: string = 'id';
    private _PARAMS_NAME: string = 'name';
    private _DEFAULT_SORT: string = 'name';
    private _LIST_NAME: string = 'galleries';


    constructor() {
        super();
        this.DATABASE_NAME = 'kofc_golf';
        this.initalizeSequelize()
 //       this.initializeGallery();
    }




    public async createEvent(data) {
    /*    try {


            const tag = {
                GalleryId: GalleryId,
                TagId: TagId,
                createdAt: moment().format('YYYY-MM-DD'),
                updatedAt: moment().format('YYYY-MM-DD'),
            };

            return await GalleryTag.findOrCreate({where: [{GalleryId: GalleryId}, {TagId: TagId}], defaults: tag});
        } catch (error) {
            console.log('the error');
            console.log(error);
            return error.toString();
        }*/
    }


    get DEFAULT_SORT(): string {
        return this._DEFAULT_SORT;
    }

    get PARAMS_ID(): string {
        return this._PARAMS_ID;
    }

    get PARAMS_NAME(): string {
        return this._PARAMS_NAME;
    }


    get LIST_NAME(): string {
        return this._LIST_NAME;
    }
}

//export const galleryMapper = await (new GalleryMapper()).initialize();

export const eventMapper = new EventMapper();