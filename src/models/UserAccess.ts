import { mysqlTable, varchar } from "drizzle-orm/mysql-core";

/** Which access roles each user has. */
export const userAccess = mysqlTable("user_access", {
    accessId: varchar("AccessId", { length: 255 }).notNull(),
    userId: varchar("UserId", { length: 255 }).notNull(),
});
