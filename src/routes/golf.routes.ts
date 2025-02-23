import expressRouter from 'express';

const golfRouter = expressRouter.Router();
import {GolfController} from "../controllers/golf.controller";



golfRouter.post("/register", GolfController.apiRegisterTournament);
golfRouter.post("/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?", GolfController.apiGetAllPlayers);
golfRouter.post("/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?", GolfController.apiGetAllPlayersWithoutTeams);
golfRouter.post("/team/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?", GolfController.apiGetAllTeams);
golfRouter.post("/team/id/:id/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?", GolfController.apiGetPlayersByTeamId);


export {golfRouter}
