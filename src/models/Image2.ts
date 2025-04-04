"use strict";

const {DataTypes, Model} = require('../db');
//import { Gallery } from "./Gallery";
//import { GalleryTag } from "./GalleryTag";
import { s3Mapper } from "../mapper";
class Image2 extends Model {
    static PARAM_FRONTCLOUD = 'https://images.tomvisions.com'
    //static PARAM_LOCATION = ''

    public static initialize(sequelize, Gallery, GalleryTag) {
        const Image = this.init({
            id: {
                type: DataTypes.STRING,
                primaryKey: true
            },


            key: {
                type: DataTypes.STRING,
            },
            active : {
                type: DataTypes.SMALLINT,
            },
            GalleryId: {
                type: DataTypes.STRING,
            },
            name: {
                type: DataTypes.STRING,
            },
            description: {
                type: DataTypes.STRING,
            },
            primaryImage: {
                type: DataTypes.STRING.BINARY,
            },
            createdAt: {
                type: DataTypes.DATE,
            },
            updatedAt: {
                type: DataTypes.DATE,
            },
            orientation: {
                type: DataTypes.SMALLINT,
            },
            order: {
                type: DataTypes.SMALLINT,
            },

        }, {
            modelName: 'Image', sequelize: sequelize, tableName:"image"
        });


        Image.Gallery = Image.hasOne(Gallery,  {sourceKey: "GalleryId", as: "gallery", foreignKey: 'id', onUpdate: 'cascade'})
        Image.GalleryTag = Image.belongsToMany(GalleryTag, { through: Gallery, throughAssociations: {
                // 1️⃣ The name of the association going from the source model (Person)
                // to the through model (LikedToot)
                fromSource: Image,

                // 2️⃣ The name of the association going from the through model (LikedToot)
                // to the source model (Person)
                toSource: GalleryTag,

                // 3️⃣ The name of the association going from the target model (Toot)
                // to the through model (LikedToot)
                fromTarget: 'id',

                // 4️⃣ The name of the association going from the through model (LikedToot)
                // to the target model (Toot)
                toTarget: 'gallery_id',
            },} );

        return Image;
    }

}

/*
//Image.belongsTo(Gallery)
Image.Gallery = Image.hasOne(Gallery,  {sourceKey: "GalleryId", as: "gallery", foreignKey: 'id', onUpdate: 'cascade'})
Image.GalleryTag = Image.belongsToMany(GalleryTag, { through: Gallery, throughAssociations: {
    // 1️⃣ The name of the association going from the source model (Person)
    // to the through model (LikedToot)
    fromSource: Image,
    
    // 2️⃣ The name of the association going from the through model (LikedToot) 
    // to the source model (Person)
    toSource: GalleryTag,
    
    // 3️⃣ The name of the association going from the target model (Toot)
    // to the through model (LikedToot)
    fromTarget: 'id',

    // 4️⃣ The name of the association going from the through model (LikedToot)
    // to the target model (Toot)
    toTarget: 'gallery_id',
  },} );

 */
export {Image2}
