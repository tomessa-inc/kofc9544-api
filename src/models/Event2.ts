const {DataTypes, Model} = require("sequelize");
import {Calendar2} from "./Calendar2";
//import {sequelize} from '../db/';
import {S3Mapper} from "../mapper/s3.mapper";

class Event2 extends Model {

    private avatar:string;

    public static initialize(sequelize) {
        return this.init({
            id: {
                type: DataTypes.STRING,
                primaryKey: true
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
            description: {
                type: DataTypes.TEXT
            },
            createdAt: {
                type: DataTypes.DATE,
            },
            updatedAt: {
                type: DataTypes.DATE,
            },
            viewing: {
                type: DataTypes.BOOLEAN
            },
        }, {
            modelName: 'Event', sequelize, tableName: "event"
        });
    }
}

export {Event2}

