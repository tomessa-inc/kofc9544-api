"use strict";

//import { GalleryTag } from "./GalleryTag";

const {DataTypes, Model} = require('../db');

class Team2 extends Model
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
             captain: {
                 type: DataTypes.STRING,
             },
             createdAt: {
                type: DataTypes.DATE,
            },
            updatedAt: {
                type: DataTypes.DATE,
            }
        }, {
            modelName: 'Team', sequelize: sequelize, tableName:"team"
        });
    }
}

export {Team2}
