import {Access} from "./Access";

const {DataTypes, Model} = require("sequelize");
//import {sequelize} from '../db/';
import {S3Mapper} from "../mapper/s3.mapper";
import {UserAccess} from "./UserAccess";

class User extends Model {
    static PARAM_FRONTCLOUD = 'https://images.tomvisions.com'

    private avatar:string;
    protected id:string
    protected userName;string


    public static initialize(sequelize, access, userAccess) {
        const user = this.init({
            id: {
                type: DataTypes.STRING,
                primaryKey: true
            },
            userName: {
                type: DataTypes.STRING,
            },
            firstName: {
                type: DataTypes.STRING,
            },
            lastName: {
                type: DataTypes.STRING,
            },
            password: {
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
            },
        }, {
            modelName: 'User', sequelize, tableName: "user"
        });

        user.Access = User.belongsToMany(access, { through: userAccess,  as: "access", throughAssociations: {
                // 1️⃣ The name of the association going from the source model (Person)
                // to the through model (LikedToot)
                fromSource: User,

                // 2️⃣ The name of the association going from the through model (LikedToot)
                // to the source model (Person)
                toSource: access,

                // 3️⃣ The name of the association going from the target model (Toot)
                // to the through model (LikedToot)
                // fromTarget: 'id',

                // 4️⃣ The name of the association going from the through model (LikedToot)
                // to the target model (Toot)
                toTarget: access,
                foreignKey: 'UserId',
                sourceKey: 'id',


                // targetKey: 'gallery_id'
            },} );


    }
}

export {User}

