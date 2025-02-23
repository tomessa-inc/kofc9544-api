"use strict";

//import { GalleryTag } from "./GalleryTag";

const {DataTypes, Model} = require('../db');

class Player extends Model
{
    /**
     *
     * @param sequelize
     */
    public static initialize(sequelize, team) {
        const player = this.init({
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
            phone: {
                type: DataTypes.STRING,
            },

            individual: {
                type: DataTypes.BOOLEAN,
            },
            TeamId: {
                type: DataTypes.STRING,
            },

            createdAt: {
                type: DataTypes.DATE,
            },
            updatedAt: {
                type: DataTypes.DATE,
            }
        }, {
            modelName: 'Player', sequelize: sequelize, tableName:"player"
        });

        player.Team = Player.hasOne(team,  {sourceKey: "TeamId", as: "team", foreignKey: 'id', onUpdate: 'cascade'})
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
export {Player}
