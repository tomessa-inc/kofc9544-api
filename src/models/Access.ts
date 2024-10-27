const {DataTypes, Model} = require("sequelize");
//import {sequelize} from '../db/';
import {S3Mapper} from "../mapper/s3.mapper";

class Access extends Model {

    public static initialize(sequelize) {
        return this.init({
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
            },
        }, {
            modelName: 'Access', sequelize, tableName: "access"
        });

    }
}

export {Access}

