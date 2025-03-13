import { BaseMapper } from ".";
import { paramsOptions } from ".";
import { Gallery2 } from "../models/Gallery2";
import {Tag2} from "../models/Tag2";
import {GalleryTag} from "../models/GalleryTag";
import {Image2} from "../models/Image2";
import {image} from "../models/Image";
import {tag} from "../models/Tag"
import { eq, and } from 'drizzle-orm';
import {gallery} from "../models/Gallery";
//import { sequelize } from "../db";

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


    private async initializeImage() {
        const tag = Tag2.initialize(this.SEQUELIZE);
        const galleryTag = GalleryTag.initialize(this.SEQUELIZE, tag);
        const gallery = Gallery2.initialize(this.SEQUELIZE, tag, galleryTag)

        Image2.initialize(this.SEQUELIZE, gallery, galleryTag);
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
            })
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

            let sql = 'SELECT count(`id`) as count FROM image WHERE active = 1 ';
            if (options) {
                sql += ` AND GalleryId = "${options['id']}"`;
            }
//            console.log(sql);
            return await this.SEQUELIZE.query(sql).then(imageCount => {
                return imageCount[0][0]['count'];
            }).catch(err => {
                return err;
            })
        } catch (error) {
            return error.toString();
        }
    }
    public async getAllPrimaryImages(options: paramsOptions) { //: Promise<string[] | string> {
        try {
            let sql = 'SELECT `Image`.`id`, `Image`.`key`, `Image`.`GalleryId`, `Image`.`name`, `Image`.`description`, `Image`.`primaryImage`, (SELECT CAST(CONCAT(\'[\',GROUP_CONCAT(JSON_OBJECT(\'TagId\', TagId)),\']\') as JSON) FROM gallery_tag where gallery_tag.GalleryId = `Image`.`GalleryId`) as TagsId, gallery.name, gallery_tag.GalleryId FROM `image` AS `Image` INNER JOIN gallery ON gallery.id = `Image`.`GalleryId` INNER JOIN gallery_tag ON gallery_tag.GalleryId = `Image`.`GalleryId` ';

            if (options.logged) {
                 sql = sql.concat(`WHERE (\`Image\`.\`primaryImage\` = 1) AND (gallery.viewing  = 1 OR gallery.viewing = 0)`);
            } else {
                sql = sql.concat(`WHERE (\`Image\`.\`primaryImage\` = 1 AND gallery.viewing = 1)`);
            }
            sql = sql.concat(' GROUP BY `Image`.`GalleryId`');


         //   console.log(this.SEQUELIZE);
          //  console.log(sql);

          //SELECT `Image`.`id`, `Image`.`key`, `Image`.`GalleryId`, `Image`.`name`, `Image`.`description`, `Image`.`primaryImage`, (SELECT CAST(CONCAT('[',GROUP_CONCAT(JSON_OBJECT('TagId', TagId)),']') as JSON) as tags FROM gallery_tag where gallery_tag.GalleryId = `Image`.`GalleryId`), `gallery_tag`.`TagId`, gallery.name, gallery_tag.GalleryId FROM `image` AS `Image` INNER JOIN gallery ON gallery.id = `Image`.`GalleryId` INNER JOIN gallery_tag ON gallery_tag.GalleryId = `Image`.`GalleryId`  WHERE `Image`.`primaryImage` = 1 GROUP BY `Image`.`GalleryId`;
       
          //   SELECT CAST(CONCAT('[',GROUP_CONCAT(JSON_OBJECT('TagId', TagId)),']') as JSON) as tags FROM gallery_tag where GalleryId = 'model-workshop-april-2011';
          return await this.DRIZZLE.execute(sql).then(galleries => {
           //     console.log('galleries')
           //   console.log(galleries)
                return this.processImageArray(galleries[0])
            }).catch(err => {
                return err;
            })
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
            const images = {
                include: [
                    {
                        Model: Gallery2,
                        association: Image2.Gallery,
                        required: false
                    },
                ],
                where: [{ GalleryId: options.id }, {active:1}],
                offset: offset,
                limit: options.pageSize,
                
            }


            return  await this.DRIZZLE.select({
                id: image.id,
                key: image.key,
                active: image.active,
                GalleryId: image.GalleryId,
                name: image.name,
                description: image.description,
                primaryImage: image.primaryImage,
                orientation: image.orientation,
                order: image.order,
                gallery: {
                    id: gallery.id,
                    name: gallery.name,
                    description: gallery.description,
                    viewing: gallery.viewing
                }
            }).from(image).innerJoin(gallery, eq(image.GalleryId, gallery.id))
                .where(and(eq(image.GalleryId, options.id),
                        eq(image.active, 1)
                    )).offset(offset).limit(options.pageSize)

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