"use strict";
//import {gallery as Gallery, image as Image} from "../models/";
import {BaseMapper, cloudFrontMapper, paramsOptions, resourceGroupTaggingApiMapper} from '.';
import moment from "moment";
import {hasSubscribers} from "diagnostics_channel";
import * as uuid from 'uuid';
import {SequelizeApi} from "../db/Sequelize";
import process from "process";
import {Tag2} from "../models/Tag2";
import {Gallery2} from "../models/Gallery2";
import {GalleryTag2} from "../models/GalleryTag2";
import {gallery} from "../models/Gallery";
import {sql, eq} from "drizzle-orm";
import {galleryTag} from "../models/GalleryTag";
import {image} from "../models/Image";
import {tag} from "../models/Tag";

export class GalleryMapper extends BaseMapper {
    private _PARAMS_ID: string = 'id';
    private _PARAMS_NAME: string = 'name';
    private _DEFAULT_SORT: string = 'name';
    private _LIST_NAME: string = 'galleries';


    constructor() {
        super();
        this.DATABASE_NAME = 'kofc_golf';
        this.initializeDrizzle()
   //     this.initializeSequelize()
     //   this.initializeGallery();
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

            const gallerySQL = this.DRIZZLE.select({
                id:gallery.id,
                name: gallery.name,
                Tags: sql<string>`(SELECT JSON_ARRAYAGG(JSON_OBJECT('id', \`tag\`.\`id\`, 'name',\`tag\`.\`name\`))
                                    FROM gallery_tag
                                    INNER JOIN tag ON tag.id = gallery_tag.TagId
                                    where gallery_tag.GalleryId = gallery.id)`.as('Tags')


            }).from(gallery).offset(offset).limit(params.pageSize)

            return this.getSQLData(gallerySQL.toSQL())

/*            const galleryConfig = {
                include: [
                    {
                        Model: Tag2,
                        association: Gallery2.Tag,
                        required: false
                    },
                ],
                attributes: {exclude: ['ImageId', 'GalleryTagTagId']},
                offset: offset,
                limit: params.pageSize,
            }
            return await Gallery2.findAll(galleryConfig).then(galleries => {
                return this.processArray(galleries);
            }).catch(err => {
                console.log('the error');
                console.log(err);
                return err;
            }) */
        } catch (error) {

            return error.toString();
        }
    }

    private async initializeGallery() {
        try {
            const tag = await Tag2.initialize(this.SEQUELIZE);
            const galleryTag = GalleryTag2.initialize(this.SEQUELIZE, tag);
            Gallery2.initialize(this.SEQUELIZE, tag, galleryTag);
        } catch (error) {
            console.log(error);

        }
    }


    /**
     *
     * @param options
     * @param body
     * @returns
     */
    public async updateGallery(options: paramsOptions, body) {
        try {

            if (body.description) {
                const updateGallery = this.DRIZZLE.update(gallery).set({
                    "description": body.description
                }).where(eq(gallery.id, options.id))

                await this.getSQLData(updateGallery.toSQL())
            }

            console.log("test")
            await this.deleteGalleryTagsByParams(options.id)
            console.log("about to insert")
            console.log(body.tags)
            body.tags.map(async (tag) => {
                console.log('the tag');
                console.log(tag);
                console.log('the gallery');
                console.log(options.id);
                console.log('the gallery2');
                await this.createGalleryTag(options.id, tag);
            });


            return true;
        } catch (error) {
            return error.toString();
        }
    }

    private async createGalleryTag(GalleryId, TagId) {
        try {

            const createGalleryTag  = this.DRIZZLE.insert(galleryTag).values( {
                GalleryId: GalleryId,
                TagId: TagId,
            })

            return await this.getSQLData(createGalleryTag.toSQL())
        } catch (error) {
            console.log('the error');
            console.log(error);
            return error.toString();
        }
    }

    private async deleteGalleryTagsByParams(id) {
        try {
            const destroyGallerySQL = this.DRIZZLE.delete(galleryTag).where(eq(galleryTag.GalleryId, id))

            await this.getSQLData(destroyGallerySQL.toSQL())

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

            const gallerySQL = this.DRIZZLE.select({
                id:gallery.id,
                name: gallery.name,
                Tags: sql<string>`(SELECT JSON_ARRAYAGG(JSON_OBJECT('id', \`tag\`.\`id\`, 'name',\`tag\`.\`name\`))
                                    FROM gallery_tag
                                    INNER JOIN tag ON tag.id = gallery_tag.TagId
                                    where gallery_tag.GalleryId = gallery.id)`.as('Tags'),
                viewing: gallery.viewing


            }).from(gallery).where(eq(gallery.id, options.id))

//            console.log('get gallery');
  //          const gallerySQL = this.DRIZZLE.select().from(gallery).where(eq(gallery.id,options.id)).leftJoin(galleryTag, (galleryTag.GalleryId, gallery.id))

            console.log(gallerySQL.toSQL())
            return this.getSQLData(gallerySQL.toSQL())

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