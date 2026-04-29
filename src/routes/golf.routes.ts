import { createRouter, defineEventHandler } from "h3";
import { GolfController } from "../controllers/golf.controller";

const golfRouter = createRouter();
golfRouter.post("/hole/page-index/:pageIndex/page-size/:pageSize/:sort/:order", defineEventHandler(GolfController.apiGetAllHoles));
golfRouter.post("/holes-missing-teams-label-value/page-index/:pageIndex/page-size/:pageSize/:sort/:order", defineEventHandler(GolfController.getAllHolesNeedingTeamsLabelValue));

golfRouter.post("/hole-new", defineEventHandler(GolfController.apiCreateHole));
golfRouter.post("/hole/:id", defineEventHandler(GolfController.apiUpdateHoleById));
golfRouter.post("/team-delete/:teamId",        defineEventHandler(GolfController.apiDeleteTeam));
golfRouter.put("/player-update/:id",                                                                           defineEventHandler(GolfController.apiUpdatePlayedById));
golfRouter.put("/team/:id",                                                                                    defineEventHandler(GolfController.apiUpdateTeamById));
golfRouter.put("/team-new",                                                                                    defineEventHandler(GolfController.apiCreateTeam));
golfRouter.post("/player-new",                                                                                    defineEventHandler(GolfController.apiCreatePlayer));
golfRouter.post("/register",                                                                                     defineEventHandler(GolfController.apiRegisterTournament));
golfRouter.post("/page-index/:pageIndex/page-size/:pageSize/:sort/:order",                                   defineEventHandler(GolfController.apiGetAllPlayers));
golfRouter.post("/teams-missing-players/page-index/:pageIndex/page-size/:pageSize/:sort/:order",             defineEventHandler(GolfController.apiGetTeamsMissingPlayers));
golfRouter.post("/teams-missing-players-label-value/page-index/:pageIndex/page-size/:pageSize/:sort/:order", defineEventHandler(GolfController.getAllTeamsNeedingPlayersLabelValue));
golfRouter.post("/players-missing-teams-label-value/page-index/:pageIndex/page-size/:pageSize/:sort/:order", defineEventHandler(GolfController.getAllPlayersNeedingTeamsLabelValue));
golfRouter.post("/team/page-index/:pageIndex/page-size/:pageSize/:sort/:order",                              defineEventHandler(GolfController.apiGetAllTeams));
golfRouter.post("/team/id/:id/page-index/:pageIndex/page-size/:pageSize/:sort/:order",                       defineEventHandler(GolfController.apiGetPlayersByTeamId));
golfRouter.post("/player-csv/:sort/:order",        defineEventHandler(GolfController.getPlayerCSV));

export { golfRouter };