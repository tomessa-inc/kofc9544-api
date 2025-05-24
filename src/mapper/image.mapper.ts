import { BaseMapper } from ".";
import { paramsOptions } from ".";
import { Gallery2 } from "../models/Gallery2";
import {Tag2} from "../models/Tag2";
import {GalleryTag2} from "../models/GalleryTag2";
import {Image2} from "../models/Image2";
import {image} from "../models/Image";
import {tag} from "../models/Tag"
import { eq, and , sql, count} from 'drizzle-orm';
import {gallery} from "../models/Gallery";
//import { sequelize } from "../db";
//import  https from "https";
const https = require('https');
import {galleryTag} from "../models/GalleryTag";
import axios from "axios";
import moment from "moment/moment";


export class ImageMapper extends BaseMapper {
    private _PARAMS_NAME: string = 'name';
    private _DEFAULT_SORT: string = 'name';


    constructor() {
        super();
        this.DATABASE_NAME = 'kofc_golf';
        this.initializeDrizzle()
     //   this.initializeSequelize()
      //  this.initializeImage();
    }


    /**
     * Update image based on Id
     * @param id 
     * @param body 
     * @returns 
     */
    public async updateImageById(id, body) {
        try {
            const image = await this.getImageById(id);

            image.description = body.description;
            image.primaryImage = body.primaryImage
            image.save();

            return image;

        } catch (error) {
            return error.toString();
        }
    }

    /**
   * Get image based ons Id
   * @param id
   * @returns 
   */
    public async getImageById(id) {
        try {
            const imageSQL = this.DRIZZLE.select({
                id: image.id,
                key: image.key,
                name: image.name,
                primaryImage: image.primaryImage,
                gallery: sql<string>`(SELECT JSON_OBJECT('id', ${gallery.id}, 'name', ${gallery.name})
                                    FROM ${gallery}
                                    where ${image.GalleryId} = ${gallery.id})`.as('gallery')


            }).from(image).leftJoin(gallery, eq(gallery.id, image.GalleryId)).where(eq(image.id, id));


/*
            const imageConfig = {
                include: [{
                    attributes: { exclude: ['ImageId', 'GalleryTagTagId'] },
                    association: Image2.Gallery,
                    required: true
                },
                ],
                where: {
                    id: id
                },
            }

            return await Image2.findOrCreate(imageConfig).then(data => {
                return data[0];
            }).catch(err => {
                return err;
            }) */

            return this.getSQLData(imageSQL.toSQL())
        } catch (error) {
            return error.toString();
        }
    }

    public async updateOrder(galleryId: string, id:string, order:number) {
        Image2.update({
            order: order,
        }, {
            where: {
                id: id
            },
        });
/*(        return await Image.(imagesConfig).then(images => {
            return this.processArray(images);
        }).catch(err => {
            return err;
        }) */


    }



    public async reOrder(id:string) {

        //const offset = ((params.pageIndex - 1) * params.pageSize)

        const imagesConfig = {
            offset: 0,
            limit: 300,
            where: {
                active: 1,
                GalleryId: id
            },
        }

        return await Image2.findAll(imagesConfig).then(images => {
            return this.processArray(images);
        }).catch(err => {
            return err;
        })


    }

    public async reNum(id:string, number:number) {

        //const offset = ((params.pageIndex - 1) * params.pageSize)

        const imagesConfig = {
            where: {
                id: id
            },
        }
       // console.log(imagesConfig)
        const image =  await Image2.findOne(imagesConfig);
      //  Image.
        console.log(image);
        image.set('order', number);
        image.save();

        /*.then(images => {
            return this.processArray(images);
        }).catch(err => {
            return err;
        }) */


    }
    public async deleteImageById(id) {
        try {

            const imageConfig = {
                where: {
                    id: id
                },
            }

            const image = await Image2.findOrCreate(imageConfig).then(data => {

                return data[0];
            }).catch(err => {
                return err;
            })

            image.active = 0;
            image.save();

            return true;

        } catch (error) {
            return error.toString();
        }
    }

    /**
     * Getting all images
     * @param params 
     * @returns 
     */
    public async getAllImages(params: paramsOptions) { //: Promise<string[] | string> {
        let offset;

        try {
            const offset = ((params.pageIndex - 1) * params.pageSize)

            const imagesConfig = {
                offset: offset,
                limit: params.pageSize,
                where: {
                    active: 1
                },
            }

            return await Image2.findAll(imagesConfig).then(images => {
                return this.processArray(images);
            }).catch(err => {
                return err;
            })
        } catch (error) {

            return error.toString();
        }
    }

    /**
     * Function which returns number of rows
     * @param options
     * @returns Returns count of images
     */
    public async getListLength(options = null) {
        try {
            const imagesCount = this.DRIZZLE.select({
                count:count()}).from(image);

            if (options) {
                imagesCount. where(and(eq(image.active, 1), eq(image.GalleryId, options['id'])));
            } else {
                imagesCount. where(eq(image.active, 1))
            }
            console.log(6)
            console.log(moment().format('yyyy-mm-dd:hh:mm:ss'))

            const test = this.getSQLData(imagesCount.toSQL(), true)
            console.log(7)
            console.log(moment().format('yyyy-mm-dd:hh:mm:ss'))


            return test
            /*
            let sql = 'SELECT count(`id`) as count FROM image WHERE active = 1 ';
            if (options) {
                sql += ` AND GalleryId = "${options['id']}"`;
            }
//            console.log(sql);
            return await this.SEQUELIZE.query(sql).then(imageCount => {
                return imageCount[0][0]['count'];
            }).catch(err => {
                return err;
            }) */
        } catch (error) {
            return error.toString();
        }
    }
    public async getAllPrimaryImages(options: paramsOptions) { //: Promise<string[] | string> {
        try {
            let sqls = 'SELECT `Image`.`id`, `Image`.`key`, `Image`.`GalleryId`, `Image`.`name`, `Image`.`description`, `Image`.`primaryImage`, (SELECT CAST(CONCAT(\'[\',GROUP_CONCAT(JSON_OBJECT(\'TagId\', TagId)),\']\') as JSON) FROM gallery_tag where gallery_tag.GalleryId = `Image`.`GalleryId`) as TagsId, gallery.name, gallery_tag.GalleryId FROM `image` AS `Image` INNER JOIN gallery ON gallery.id = `Image`.`GalleryId` INNER JOIN gallery_tag ON gallery_tag.GalleryId = `Image`.`GalleryId` ';

            if (options.logged) {
                sqls = sqls.concat(`WHERE (\`Image\`.\`primaryImage\` = 1) AND (gallery.viewing  = 1 OR gallery.viewing = 0)`);
            } else {
                sqls = sqls.concat(`WHERE (\`Image\`.\`primaryImage\` = 1 AND gallery.viewing = 1)`);
            }
            sqls = sqls.concat(' GROUP BY `Image`.`GalleryId`');


            //   console.log(this.SEQUELIZE);
            //  console.log(sql);

            //SELECT `Image`.`id`, `Image`.`key`, `Image`.`GalleryId`, `Image`.`name`, `Image`.`description`, `Image`.`primaryImage`, (SELECT CAST(CONCAT('[',GROUP_CONCAT(JSON_OBJECT('TagId', TagId)),']') as JSON) as tags FROM gallery_tag where gallery_tag.GalleryId = `Image`.`GalleryId`), `gallery_tag`.`TagId`, gallery.name, gallery_tag.GalleryId FROM `image` AS `Image` INNER JOIN gallery ON gallery.id = `Image`.`GalleryId` INNER JOIN gallery_tag ON gallery_tag.GalleryId = `Image`.`GalleryId`  WHERE `Image`.`primaryImage` = 1 GROUP BY `Image`.`GalleryId`;

            //   SELECT CAST(CONCAT('[',GROUP_CONCAT(JSON_OBJECT('TagId', TagId)),']') as JSON) as tags FROM gallery_tag where GalleryId = 'model-workshop-april-2011';

            // Define your schema
            console.log(2)

            console.log(moment().format('yyyy-mm-dd:hh:mm:ss'))
            const imagesByGallery = this.DRIZZLE.select({
                id: image.id,
                key: image.key,
                GalleryId: image.GalleryId,
                name: gallery.name,
                primaryImage: image.primaryImage,
                description: image.description,
                active: image.active,
                orientation: image.orientation,
                order: image.order,
                TagsId: sql<string>`(SELECT JSON_ARRAYAGG(JSON_OBJECT('TagId', ${galleryTag.TagId}))
                                    FROM ${galleryTag}
                                    where ${galleryTag.GalleryId} = ${image.GalleryId})`.as('TagsId')
            }).from(image).innerJoin(gallery, eq(image.GalleryId, gallery.id))


            //.where(eq(image.active, 1))

            if (options.logged) {
                //    .where(and(eq(image.GalleryId, options.id),
                //          eq(image.active, 1)
                imagesByGallery.where(eq(image.primaryImage, 1));
                //= sqls.concat(`WHERE (\`Image\`.\`primaryImage\` = 1) AND (gallery.viewing  = 1 OR gallery.viewing = 0)`);
            } else {
                imagesByGallery.where(and(eq(image.primaryImage, 1), eq(gallery.viewing, true)));

                sqls = sqls.concat(`WHERE (\`Image\`.\`primaryImage\` = 1 AND gallery.viewing = 1)`);
            }
            sqls = sqls.concat(' GROUP BY `Image`.`GalleryId`');


            /*
                      const retval = this.DRIZZLE.prepare(sql`Select \`Image\`.\`id\`,
                                                                     \`Image\`.\`key\`,
                                                                     \`Image\`.\`GalleryId\`,
                                                                     \`Image\`.\`name\`,
                                                                     \`Image\`.\`description\`,
                                                                     \`Image\`.\`primaryImage\`,
                                                                     (SELECT CAST(CONCAT(\'[\', GROUP_CONCAT(JSON_OBJECT(\'TagId\', TagId)), \']\') as JSON)
                                                                      FROM gallery_tag
                                                                      where gallery_tag.GalleryId = \`Image\`.\`GalleryId\`) as TagsId,
                                                                     gallery.name,
                                                                     gallery_tag.GalleryId`); */
            console.log(3)

            console.log(moment().format('yyyy-mm-dd:hh:mm:ss'))

            const testing = this.processImageArray(await imagesByGallery)
         //   const test = this.getSQLData(imagesByGallery.toSQL(), true)
            console.log(4)

            console.log(moment().format('yyyy-mm-dd:hh:mm:ss'))

            return testing
/*            const ff = JSON.stringify(imagesByGallery.toSQL())
            const sqlquery = ff.replace(/"/g, '\\\"').replace(/\\n/g, "")

            const text = JSON.parse(`{"sql": "${sqlquery}"}`)
            //     console.log('galleries')
            //   console.log(galleries)

            // console.log(imagesByGallery.toSQL())



            let result;


            return await axios.post('https://api-stage.db.tomessa.ca/kofc_golf',
                text
            )
                .then( async (response) => {
                 ///   console.log(this.processImageArray(response.data.data[0]))
                    return await this.processImageArray(response.data.data[0])
                })
                .catch( (error)=>  {
                    console.log(error);
                });
       //     console.log("look")
         //   console.log(look);
/*
            const optionsHttp = {
                hostname: 'api-stage.db.tomessa.ca',
                port: 443,
                path: '/kofc_golf',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            };
            console.log("right here")
            https.post({
                hostname: 'api-stage.db.tomessa.ca',
                port: 443,
                path: '/kofc_golf',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }

            }, {
            `"sql": "${sqlquery}"`
            }, (error, response, text) => {
                console.log(error);
                console.log(response);
                console.log(text)

            })

            /*
                        const req = https.request(optionsHttp, (res) => {
                            console.log("the response")
                            console.log(res);
                            let data = '';

                            res.on('data', (chunk) => {
                                console.log("hello")
                                data += chunk;
                            });

                            res.on('end', () => {

            //                    console.log(JSON.parse(data));
                                result = data;
                                console.log("finished")
                            });
                        });

                        req.on('error', (error) => {
                            console.error(error);
                        });
                        req.write(text);
                        req.end();

                        console.log("the result")
                        console.log(result);

                        return this.processImageArray(result) */

                    } catch (error) {

                        return error.toString();
                    }

    }

 /**
 * 
 * @param options 
 * @returns 
 */
    public async getImagesByGallery(options: paramsOptions) {
        try {

            const offset = ((options.pageIndex - 1) * options.pageSize)

            console.log(2)
            console.log(moment().format('yyyy-mm-dd:hh:mm:ss'))
            const select =  this.DRIZZLE.select({
                id: image.id,
                key: image.key,
                active: image.active,
                GalleryId: image.GalleryId,
                name: image.name,
                description: image.description,
                primaryImage: image.primaryImage,
                orientation: image.orientation,
                order: image.order,
                gallery: sql<string>`(SELECT JSON_OBJECT('id', ${gallery.id}, 'name', ${gallery.name})
                                    FROM ${gallery}
                                    where ${gallery.id} = ${image.GalleryId})`.as('gallery'),
            }).from(image)
                .where(and(eq(image.GalleryId, options.id),
                        eq(image.active, 1)
                    )).offset(offset).limit(options.pageSize)
            console.log(3)
            console.log(moment().format('yyyy-mm-dd:hh:mm:ss'))
            const test = this.getSQLData(select.toSQL())
            console.log(4)
            console.log(moment().format('yyyy-mm-dd:hh:mm:ss'))
            return test
/*
            const ff = JSON.stringify(select.toSQL())

            const str = ff.replace(/"/g, '\\\"')



          //  console.log(select.toSQL())
           // console.log(select.toSQL().params.join(","))

         /*   return await Image2.findAll(images).then(data => {
                return this.processArray(data);
            }).catch(err => {
                return err;
            }) */
        } catch (error) {
            console.log(`Could not fetch galleries ${error}`)
        }
    }


    get DEFAULT_SORT(): string {
        return this._DEFAULT_SORT;
    }

    get PARAMS_NAME(): string {
        return this._PARAMS_NAME;
    }

}

export const imageMapper = new ImageMapper();