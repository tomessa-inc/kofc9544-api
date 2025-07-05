const {DataTypes, Model} = require("sequelize");
//import {sequelize} from '../db/';
import {S3Mapper} from "../mapper/s3.mapper";

class Calendar2 extends Model {

    private avatar:string;

    public static initialize(sequelize, Event) {
        const calendar =  this.init({
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
            EventId: {
                type: DataTypes.STRING
            },
            createdAt: {
                type: DataTypes.DATE,
            },
            updatedAt: {
                type: DataTypes.DATE,
            },
        }, {
            modelName: 'Calendar', sequelize, tableName: "calendar"
        });
        calendar.Event = calendar.hasOne(Event,  {sourceKey: "EventId", foreignKey: 'id', onUpdate: 'cascade'})

    }
}

export {Calendar2}

