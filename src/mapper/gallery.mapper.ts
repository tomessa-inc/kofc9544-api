"use strict";
//import {gallery as Gallery, image as Image} from "../models/";
import {BaseMapper, cloudFrontMapper, paramsOptions, resourceGroupTaggingApiMapper} from '.';
import moment from "moment";
import {hasSubscribers} from "diagnostics_channel";
import * as uuid from 'uuid';
import {SequelizeApi} from "../db/Sequelize";
import process from "process";
import {Tag} from "../models/Tag";
import {Gallery} from "../models/Gallery";
import {GalleryTag} from "../models/GalleryTag";

export class GalleryMapper extends BaseMapper {
    private _PARAMS_ID: string = 'id';
    private _PARAMS_NAME: string = 'name';
    private _DEFAULT_SORT: string = 'name';
    private _LIST_NAME: string = 'galleries';


    constructor() {
        super();
        this.DATABASE_NAME = 'kofc_golf';
        this.initializeSequelize()
        this.initializeGallery();
    }

    public async publishGallery() {
        const resources = (await resourceGroupTaggingApiMapper.getResourceByTag({
            key: "Environment",
            value: process.env.NODE_ENV
        }))['ResourceTagMappingList'][0];
        const id = resources['ResourceARN'].split("/").pop();
        const checkValidation = await cloudFrontMapper.createInvalidation("/media/*", id)
        if (checkValidation['Invalidation'].Status === "InProgress") {
            return true;
        } else {
            return false
        }
    }

    public async getAllGalleries(params: paramsOptions) { //: Promise<string[] | string> {
        try {
            console.log(params);

            const offset = ((params.pageIndex - 1) * params.pageSize) ?? 1

            console.log("offset")

            console.log(offset);
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
                limit: params.pageSize,
            }
            return await Gallery.findAll(galleryConfig).then(galleries => {
                return this.processArray(galleries);
            }).catch(err => {
                console.log('the error');
                console.log(err);
                return err;
            })
        } catch (error) {

            return error.toString();
        }
    }

    private async initializeGallery() {
        try {
            const tag = await Tag.initialize(this.SEQUELIZE);
            const galleryTag = GalleryTag.initialize(this.SEQUELIZE, tag);
            Gallery.initialize(this.SEQUELIZE, tag, galleryTag);
        } catch (error) {
            console.log(error);

        }
    }


    /**
     *
     * @param options
     * @returns
     */
    public async updateGallery(options: paramsOptions, body) {
        try {
            const gallery = await this.getGalleryById(options);
            console.log('the gallery');
            console.log(gallery);
            gallery.description = body.description
            gallery.save();


            await this.deleteGalleryTagsByParams({where: {GalleryId: options.id}})

            body.tags.map(async (tag) => {
                console.log('the tag');
                console.log(tag);
                console.log('the gallery');
                console.log(gallery.id);
                await this.createGalleryTag(gallery.id, tag);
            });


            return true;
        } catch (error) {
            return error.toString();
        }
    }

    private async createGalleryTag(GalleryId, TagId) {
        try {
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
        }
    }

    private async deleteGalleryTagsByParams(where) {
        try {
            await GalleryTag.destroy(where);

            return true;
        } catch (error) {
            return error.toString();
        }

    }


    /**
     *
     * @param options
     * @returns
     */
    public async getGalleryById(options: paramsOptions) {
        try {
            console.log('get gallery');

            const galleryParams = {
                include: [
                    {
                        Model: Tag,
                        association: Gallery.Tag,
                        required: false
                    },
                ],
                where: {id: options.id},
                attributes: {exclude: ['ImageId', 'GalleryTagTagId']},
            }

            return await Gallery.findOrCreate(galleryParams).then(data => {

                return data[0];
            }).catch(err => {

                return err;
            })
        } catch (error) {
            return error.toString();
        }
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

export const galleryMapper = new GalleryMapper();