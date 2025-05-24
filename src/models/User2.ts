import {Access2} from "./Access2";

const {DataTypes, Model} = require("sequelize");
//import {sequelize} from '../db/';
import {S3Mapper} from "../mapper/s3.mapper";
import {UserAccess2} from "./UserAccess2";
import {UserAuthentication2} from "./UserAuthentication2";
import {Base} from "./Base";


class User2 extends Model {
    protected id:string
    protected userName:string


    public static initialize(sequelize,model) {
       // console.log('check')
       // console.log(sequelize)
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


        user.Access = User2.belongsToMany(model.access, { through: model.userAccess,  as: "access", throughAssociations: {
                // 1️⃣ The name of the association going from the source model (Person)
                // to the through model (LikedToot)
                fromSource: User2,

                // 2️⃣ The name of the association going from the through model (LikedToot)
                // to the source model (Person)
                toSource: model.access,

                // 3️⃣ The name of the association going from the target model (Toot)
                // to the through model (LikedToot)
                // fromTarget: 'id',

                // 4️⃣ The name of the association going from the through model (LikedToot)
                // to the target model (Toot)
                toTarget: model.access,
                foreignKey: 'UserId',
                sourceKey: 'id',


                // targetKey: 'gallery_id'
            },} );

        return user;
      //  Image.Gallery = Image.hasOne(Gallery,  {sourceKey: "GalleryId", as: "gallery", foreignKey: 'id', onUpdate: 'cascade'})
    }
}

export {User2}

