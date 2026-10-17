import { H3 } from "h3";
import { AuthController } from "../controllers/auth.controller";

const authRouter = new H3();

authRouter.get("/codes", AuthController.apiGetCodes);
authRouter.post("/login", AuthController.apiPostSignIn);
authRouter.post("/logout", AuthController.apiPostSignOut);

export { authRouter };
