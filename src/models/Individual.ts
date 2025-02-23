"use strict";

//import { GalleryTag } from "./GalleryTag";

const {DataTypes, Model} = require('../db');

class Individual extends Model
{
    /**
     *
     * @param sequelize
     */
    public static initialize(sequelize) {
        return this.init({
            id: {
                type: DataTypes.STRING,
                primaryKey: true
            },
            name: {
                type: DataTypes.STRING,
            },
            email: {
                type: DataTypes.STRING,
            },
            createdAt: {
                type: DataTypes.DATE,
            },
            updatedAt: {
                type: DataTypes.DATE,
            }
        }, {
            modelName: 'Individual', sequelize: sequelize, tableName:"individual"
        });
    }
}
/*
Tag.init({
    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
    },
    description: {
        type: DataTypes.STRING,
    },
    createdAt: {
        type: DataTypes.DATE,
    },
    updatedAt: {
        type: DataTypes.DATE,
    }
}, {
    modelName: 'Tag', sequelize: sequelize, tableName:"tag"
});
*/
export {Individual}
