import {accessMapper, galleryMapper, paramsOptions, tagMapper, userMapper} from "../mapper/";

export class AccessController {

    /**
     * Function that determins if your username and password are correct
     * @param req
     * @param res
     * @param next
     */
    public static async apiPostSignIn(req: any, res: any, next: any) {
        try {
            if (req.body[accessMapper.PARAMS_NAME] && req.body[accessMapper.PARAMS_DESCRIPTION]) {
                const user = await accessMapper.getUserBasedOnPassword(req.body);
                console.log('user1');
                console.log(user);
                if (typeof(user) !== "object") {

                    return res.status(500).json({ error: "Username and/or Password incorrect" })
                }

                console.log("good stuff")

                return res.status(200).json({"user":user, "token":userMapper.generateJWTToken()});
            } else {
                console.log("Missing either Username and/or password");
                return res.status(500).json({ error: "Missing either Username and/or password" })
            }
        } catch (error) {
            return res.status(500).json({ error: error.toString() })
        }

    }

    /**
     * Function that determins if your username and password are correct
     * @param req
     * @param res
     * @param next
     */
    public static async apiDeleteAccess(req: any, res: any, next: any) {

        return res.status(200).json({"sign-out":true});
    }
    /*

        server.post(`${apiPrefix}/sign-in`, (schema, { requestBody }) => {
            const { userName, password } = JSON.parse(requestBody)
            const user = schema.db.signInUserData.findBy({
                accountUserName: userName,
                password,
            })
            console.log('user', user)
            if (user) {
                const { avatar, userName, email, authority } = user
                return {
                    user: { avatar, userName, email, authority },
                    token: 'wVYrxaeNa9OxdnULvde1Au5m5w63',
                }
            }
            return new Response(
                401,
                { some: 'header' },
                { message: 'Invalid email or password!' }
            )
        })
    */


    /**
     * Sign up to Service functionality
     * @param req
     * @param res
     * @param next
     */
    public static async apiCreateAccess(req: any, res: any, next: any) {
        try {

            if (req.body[accessMapper.PARAMS_NAME] && req.body[accessMapper.PARAMS_DESCRIPTION]) {
                console.log('hre');

                const user = await accessMapper.apiCreateAccess(req.body);
                console.log('there');
                console.log(user);
                if (!user) {
                    return res.status(500).json({ error: "Username already exists" })
                }

                return res.status(200).json({ result: "success", message: "User has been created" });
            }
        } catch (error) {

            return res.status(500).json({ error: error.toString() })
        }
    }

    public static async patchAccess(req: any, res: any, next: any) {
        try {
            if (req.body[userMapper.PARAMS_ID] && req.body[userMapper.PARAMS_USER]) {
                const userUpdate = true; //await userMapper.apiUpdateUser(req.body);

                if (!userUpdate) {

                    return res.status(500).json({ result: "error", message: "User has not been successfully updated" })
                }

                return res.status(200).json({ result: "success", message: "User has been successfully updated" });
            }

            return res.status(500).json({ result: "error", message: "Missing parameters to access this function" })

        } catch (error) {
            return res.status(500).json({ result: "error", message: error.toString() })
        }
    }

    /**
     * Get All Users
     * @param req
     * @param res
     * @param next
     */
    public static async getAllAccess(req: any, res: any, next: any) {
        try {
            //         if (!userMapper.checkAuthenication(req.headers.authorization)) {
            //           return res.status(500).json({error: 'Not Authorized to access the API'})
            //     }
            console.log('get all access')

            const options: paramsOptions = { pageIndex: 1, pageSize: 10, filterQuery: "", sort: accessMapper.DEFAULT_SORT, order: accessMapper.DEFAULT_ORDER };

            Object.entries(req.params).map(([key, value]) => {
                if (value !== 'undefined') {
                    if (isNaN(Number(value))) {
                        options[key] = value;
                    } else {
                        options[key] = Number(value);
                    }
                }
            })

            const access = await accessMapper.getAllAccess(options);
            console.log("access")
            console.log(access);
            if (typeof access === 'string') {
                return res.status(500).json({ error: access })
            }

            const paginationResults = userMapper.prepareListResults(access, req.query);

            return res.status(200).json(paginationResults)
        } catch (error) {

            return res.status(500).json({ error: error.toString() })
        }

    }

    /**
     * Calling all galleries
     * @param req
     * @param res
     * @param next
     */
    public static async apiGetAllAccessAsLabelValues(req: any, res: any, next: any) {
        try {
            //        if (!galleryMapper.checkAuthenication(req.headers.authorization)) {
            //        return res.status(500).json({error: 'Not Authorized to access the API'})
            //      }

            const options: paramsOptions = { pageIndex: 1, pageSize: 10, filterQuery: "", sort: galleryMapper.DEFAULT_SORT, order: galleryMapper.DEFAULT_ORDER };

            Object.entries(req.params).map(([key, value]) => {
                if (value !== 'undefined') {
                    if (isNaN(Number(value))) {
                        options[key] = value;
                    } else {
                        options[key] = Number(value);
                    }
                }
            })

            const access = await accessMapper.getAllAccess(options);




            if (typeof access === 'string') {
                return res.status(500).json({ errors_string: access })
            }

            const accessList = access.map((accessItems) => {
                return {"label": accessItems.name, "value": accessItems.id}
            });

            return res.status(200).json(accessList);

        } catch (error) {
            res.status(500).json({ error_main: error.toString() })
        }

    }
}
