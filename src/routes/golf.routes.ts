import { H3 } from "h3";
import { GolfController } from "../controllers/golf.controller";

const golfRouter = new H3();
golfRouter.post("/hole/page-index/:pageIndex/page-size/:pageSize/:sort/:order", GolfController.apiGetAllHoles);
golfRouter.post("/holes-missing-teams-label-value/page-index/:pageIndex/page-size/:pageSize/:sort/:order", GolfController.getAllHolesNeedingTeamsLabelValue);

golfRouter.post("/hole-new", GolfController.apiCreateHole);
golfRouter.post("/hole/:id", GolfController.apiUpdateHoleById);
golfRouter.delete("/team-delete/:teamId",        GolfController.apiDeleteTeam);
golfRouter.delete("/player-delete/:playerId",        GolfController.apiDeletePlayer);
golfRouter.post("/player/import",        GolfController.apiImportPlayers);

golfRouter.put("/player-update/:id",                                                                           GolfController.apiUpdatePlayedById);
golfRouter.put("/team/:id",                                                                                    GolfController.apiUpdateTeamById);
golfRouter.put("/team-new",                                                                                    GolfController.apiCreateTeam);
golfRouter.post("/player-new",                                                                                    GolfController.apiCreatePlayer);
golfRouter.post("/register",                                                                                     GolfController.apiRegisterTournament);
golfRouter.post("/page-index/:pageIndex/page-size/:pageSize/:sort/:order",                                   GolfController.apiGetAllPlayers);
golfRouter.post("/teams-missing-players/page-index/:pageIndex/page-size/:pageSize/:sort/:order",             GolfController.apiGetTeamsMissingPlayers);
golfRouter.post("/teams-missing-players-label-value/page-index/:pageIndex/page-size/:pageSize/:sort/:order", GolfController.getAllTeamsNeedingPlayersLabelValue);
golfRouter.post("/players-missing-teams-label-value/page-index/:pageIndex/page-size/:pageSize/:sort/:order", GolfController.getAllPlayersNeedingTeamsLabelValue);
golfRouter.post("/team/page-index/:pageIndex/page-size/:pageSize/:sort/:order",                              GolfController.apiGetAllTeams);
golfRouter.post("/team/id/:id/page-index/:pageIndex/page-size/:pageSize/:sort/:order",                       GolfController.apiGetPlayersByTeamId);
golfRouter.post("/player-csv/:sort/:order",        GolfController.getPlayerCSV);

export { golfRouter };