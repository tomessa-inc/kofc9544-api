"use strict";

import { Gallery } from "./Gallery";
import { Tag } from "./Tag";
const {DataTypes, Model, sequelize} = require('../db');
class UserAccess extends Model {

    /**
     *
     * @param sequelize
     * @param access
     */
    public static initialize(sequelize, model) {
        const userAccess = this.init({
            AccessId: {
                type: DataTypes.STRING,
                primaryKey: true
            },
            UserId: {
                type: DataTypes.STRING,
            },
            createdAt: {
                type: DataTypes.DATE,
            },
            updatedAt: {
                type: DataTypes.DATE,
            }
        }, {
            modelName: 'UserAccess', sequelize: sequelize, tableName:"user_access"
        });

        userAccess.Access = model.access.hasMany(userAccess,  {sourceKey: "id",  foreignKey: 'AccessId', onUpdate: 'cascade'})

        return userAccess;
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
export {UserAccess}
