const {DataTypes, Model} = require("sequelize");
//import {sequelize} from '../db/';
import {S3Mapper} from "../mapper/s3.mapper";

class Event extends Model {

    private avatar:string;

    public static initialize(sequelize) {
        return this.init({
            id: {
                type: DataTypes.STRING,
                primaryKey: true
            },
            day: {
                type: DataTypes.NUMBER
            },
            month: {
                type: DataTypes.NUMBER
            },
            year: {
                type: DataTypes.NUMBER
            },
            hourStart: {
                type: DataTypes.NUMBER
            },
            minuteStart: {
                type: DataTypes.NUMBER
            },
            hourEnd: {
                type: DataTypes.NUMBER
            },
            minuteEnd: {
                type: DataTypes.NUMBER
            },
            text: {
                type: DataTypes.STRING
            },
            createdAt: {
                type: DataTypes.DATE,
            },
            updatedAt: {
                type: DataTypes.DATE,
            }
        }, {
            modelName: 'Event', sequelize, tableName: "event"
        });
    }
}

export {Event}

