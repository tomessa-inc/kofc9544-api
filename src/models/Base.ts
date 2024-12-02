const {DataTypes, Model} = require("sequelize");

export class Base extends Model {
    static PARAM_FRONTCLOUD = 'https://images.tomvisions.com';
}
