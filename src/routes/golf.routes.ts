import expressRouter from 'express';

const golfRouter = expressRouter.Router();
import {GolfController} from "../controllers/golf.controller";


golfRouter.put("/player/id/:id", GolfController.apiUpdatePlayedById);
golfRouter.post("/register", GolfController.apiRegisterTournament);
golfRouter.post("/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?", GolfController.apiGetAllPlayers);
//golfRouter.post("/missing-players/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?", GolfController.apiGetAllPlayersWithoutTeams);
golfRouter.post("/teams-missing-players/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?", GolfController.apiGetTeamsMissingPlayers);
golfRouter.post("/teams-missing-players-label-value/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?", GolfController.getAllTeamsNeedingPlayersLabelValue);
golfRouter.post("/players-missing-teams-label-value/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?", GolfController.getAllPlayersNeedingTeamsLabelValue);

golfRouter.post("/team/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?", GolfController.apiGetAllTeams);
golfRouter.post("/team/id/:id/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?", GolfController.apiGetPlayersByTeamId);


export {golfRouter}
