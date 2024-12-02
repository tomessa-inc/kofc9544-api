"use strict";

import { Gallery } from "./Gallery";
import { Tag } from "./Tag";
const {DataTypes, Model, sequelize} = require('../db');
import {User} from "../models/User";
import {use} from "chai";
class UserAuthentication extends Model {

    /**
     *
     * @param sequelize
     * @param model
     */
    public static initialize(sequelize, model) {
        const userAuthentication =  this.init({
            UserId: {
                type: DataTypes.STRING,
            },
            eventType: {
                type: DataTypes.STRING,
            },
            token: {
                type: DataTypes.STRING,
            },
            createdAt: {
                type: DataTypes.DATE,
            },
            updatedAt: {
                type: DataTypes.DATE,
            }
        }, {
            modelName: 'UserAuthentication', sequelize: sequelize, tableName:"user_authentication",
        });

        userAuthentication.User = userAuthentication.hasOne(model.user,  {sourceKey: "UserId", as: "user", foreignKey: 'id', onUpdate: 'cascade'})

        return userAuthentication;
    }
}

export {UserAuthentication}
