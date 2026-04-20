import { createRouter, defineEventHandler } from "h3";
import { GolfController } from "../controllers/golf.controller";

const golfRouter = createRouter();
golfRouter.put("/team/:id",                                                                                    defineEventHandler(GolfController.apiUpdateTeamById));
golfRouter.put("/team-new",                                                                                    defineEventHandler(GolfController.apiCreateTeam));
golfRouter.post("/player-new",                                                                                    defineEventHandler(GolfController.apiCreatePlayer));
golfRouter.post("/register",                                                                                     defineEventHandler(GolfController.apiRegisterTournament));
golfRouter.post("/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?",                                   defineEventHandler(GolfController.apiGetAllPlayers));
golfRouter.post("/teams-missing-players/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?",             defineEventHandler(GolfController.apiGetTeamsMissingPlayers));
golfRouter.post("/teams-missing-players-label-value/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?", defineEventHandler(GolfController.getAllTeamsNeedingPlayersLabelValue));
golfRouter.post("/players-missing-teams-label-value/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?", defineEventHandler(GolfController.getAllPlayersNeedingTeamsLabelValue));
golfRouter.post("/team/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?",                              defineEventHandler(GolfController.apiGetAllTeams));
golfRouter.post("/team/id/:id/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?",                       defineEventHandler(GolfController.apiGetPlayersByTeamId));


export { golfRouter };