import { int, mysqlTable, primaryKey } from "drizzle-orm/mysql-core";
import { player } from "./Player";
import { year } from "./Year";

/** Which years each golf player was active. */
export const playerYear = mysqlTable("player_year", {
    playerId: int("PlayerId").notNull().references(() => player.id, { onDelete: "cascade" }),
    yearId: int("YearId").notNull().references(() => year.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.playerId, table.yearId] })]);
