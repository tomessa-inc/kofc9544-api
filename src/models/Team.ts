import { datetime, mysqlTable, varchar } from "drizzle-orm/mysql-core";

export const team = mysqlTable("team", {
    id: varchar("id", { length: 25 }).primaryKey(),
    name: varchar("name", { length: 45 }),
    captain: varchar("captain", { length: 45 }),
    hole: varchar("hole", { length: 45 }),
    createdAt: datetime("createdAt"),
    updatedAt: datetime("updatedAt"),
});
