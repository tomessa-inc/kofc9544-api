"use strict";

import { Gallery2 } from "./Gallery2";
import { Tag2 } from "./Tag2";
const {DataTypes, Model, sequelize} = require('../db');

class GalleryTag2 extends Model {

    /**
     *
     * @param sequelize
     * @param Tag
     */
    public static initialize(sequelize, Tag) {
        const galleryTag = this.init({
            TagId: {
                type: DataTypes.STRING,
                primaryKey: true
            },
            GalleryId: {
                type: DataTypes.STRING,
            },
            createdAt: {
                type: DataTypes.DATE,
            },
            updatedAt: {
                type: DataTypes.DATE,
            }
        }, {
            modelName: 'GalleryTag', sequelize: sequelize, tableName:"gallery_tag"
        });

        galleryTag.Tag = Tag.hasMany(GalleryTag2,  {sourceKey: "id", as: "gallery_tag",  foreignKey: 'TagId', onUpdate: 'cascade'})

        return galleryTag;
    }
}
/*
GalleryTag.init({
    TagId: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    GalleryId: {
        type: DataTypes.STRING,
    },
    createdAt: {
        type: DataTypes.DATE,
    },
    updatedAt: {
        type: DataTypes.DATE,
    }
}, {
    modelName: 'GalleryTag', sequelize: sequelize, tableName:"gallery_tag"
});

//GalleryTag.hasOne(Tag, {
  //  foreignKey:  {
    //    name: 'tag_id'
  //  }
//});


//Gallery.GalleryTag = Gallery.hasMany(GalleryTag,{sourceKey: "id", as: "gallery_tag", foreignKey: 'gallery_id', onUpdate: 'cascade'} )
///Tag.GalleryTag = Tag.hasMany(GalleryTag,  {sourceKey: "id", as: "gallery_tag",  foreignKey: 'tag_id', onUpdate: 'cascade'})

//User.TeamUser = User.hasMany(TeamUser, {as: 'teams', foreignKey: 'UserId', onUpdate: 'cascade'});
//User.Access.ts = User.hasOne(Access.ts, {sourceKey: "AccessId", as: 'access', foreignKey: 'slug', onUpdate: 'cascade'});


//Tag.belongsTo(GalleryTag);
/*Tag.hasOne(GalleryTag, {
    foreignKey:  {
        name: 'tag_id'
    }
});
GalleryTag.belongsTo(Tag);
*/
export {GalleryTag2}
